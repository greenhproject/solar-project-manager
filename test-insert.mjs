import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { dynamicDocTemplates } from './drizzle/schema.ts';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function main() {
  const conn = await mysql.createConnection(DATABASE_URL);
  const db = drizzle(conn, { mode: 'default' });
  
  try {
    // Test insert with Drizzle ORM
    console.log('Testing Drizzle ORM insert...');
    const result = await db.insert(dynamicDocTemplates).values({
      name: 'Test Template Drizzle',
      description: 'Test description',
      category: 'Test',
      fileName: 'test.docx',
      fileKey: 'test-key',
      fileUrl: 'https://example.com/test.docx',
      fileSize: 1234,
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      uploadedBy: 1,
    });
    console.log('INSERT SUCCESS:', JSON.stringify(result));
    
    // Clean up
    const insertId = result[0].insertId;
    if (insertId) {
      await conn.execute('DELETE FROM dynamic_doc_templates WHERE id = ?', [insertId]);
      console.log('Cleaned up test row id:', insertId);
    }
  } catch (error) {
    console.error('INSERT FAILED:', error.message);
    if (error.sql) console.error('SQL:', error.sql);
    console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
  }
  
  await conn.end();
}

main().catch(e => console.error(e.message));

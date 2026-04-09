import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function test() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Try a direct insert
    const [result] = await connection.execute(
      `INSERT INTO dynamic_doc_templates (name, description, category, fileName, fileKey, fileUrl, fileSize, mimeType, isActive, uploadedBy) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        'Test Template',
        'Test description',
        'certificados',
        'test.docx',
        'dynamic-templates/test-key.docx',
        'https://example.com/test.docx',
        12345,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        true,
        206
      ]
    );
    console.log('✅ Direct SQL insert succeeded:', result);
    
    // Clean up
    await connection.execute(`DELETE FROM dynamic_doc_templates WHERE name = 'Test Template'`);
    console.log('✅ Cleaned up test record');
  } catch (error) {
    console.error('❌ Insert failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await connection.end();
  }
}

test();

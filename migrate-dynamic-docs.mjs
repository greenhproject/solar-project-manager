import mysql from 'mysql2/promise';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

async function migrate() {
  const connection = await mysql.createConnection(DATABASE_URL);
  
  try {
    // Create dynamic_doc_templates table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dynamic_doc_templates (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        fileName VARCHAR(255) NOT NULL,
        fileKey VARCHAR(500) NOT NULL,
        fileUrl TEXT NOT NULL,
        fileSize INT NOT NULL,
        mimeType VARCHAR(100) NOT NULL,
        isActive BOOLEAN NOT NULL DEFAULT TRUE,
        uploadedBy INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log('✅ Created dynamic_doc_templates table');

    // Create dynamic_doc_fields table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS dynamic_doc_fields (
        id INT AUTO_INCREMENT PRIMARY KEY,
        templateId INT NOT NULL,
        fieldKey VARCHAR(100) NOT NULL,
        fieldLabel VARCHAR(255) NOT NULL,
        fieldType ENUM('text', 'number', 'date', 'select', 'project') NOT NULL DEFAULT 'text',
        \`options\` TEXT,
        projectMapping VARCHAR(100),
        defaultValue TEXT,
        orderIndex INT NOT NULL DEFAULT 0,
        isRequired BOOLEAN NOT NULL DEFAULT TRUE,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX template_idx (templateId)
      )
    `);
    console.log('✅ Created dynamic_doc_fields table');

    // Create generated_dynamic_docs table
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS generated_dynamic_docs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        projectId INT NOT NULL,
        templateId INT NOT NULL,
        fileName VARCHAR(255) NOT NULL,
        fileKey VARCHAR(500) NOT NULL,
        fileUrl TEXT NOT NULL,
        fileSize INT NOT NULL,
        fieldValues TEXT NOT NULL,
        generatedBy INT NOT NULL,
        createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX project_idx (projectId),
        INDEX template_idx (templateId)
      )
    `);
    console.log('✅ Created generated_dynamic_docs table');

    console.log('\n🎉 Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

migrate();

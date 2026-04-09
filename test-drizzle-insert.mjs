// Test Drizzle ORM insert for dynamic_doc_templates
// We need to use the compiled server code, so let's test via the API endpoint
import http from 'http';

const data = JSON.stringify({
  name: 'Test Drizzle Template',
  description: 'Test description',
  category: 'certificados',
  fileName: 'test.docx',
  fileKey: 'dynamic-templates/test-key.docx',
  fileData: Buffer.from('test content').toString('base64'),
  fileSize: 12345,
  mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
});

console.log('Data to send:', data);
console.log('Data length:', data.length);
console.log('mimeType length:', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'.length);

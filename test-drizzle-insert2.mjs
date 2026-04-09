// Test Drizzle insert by calling the server endpoint directly
import http from 'http';

const payload = JSON.stringify({
  "0": {
    "json": {
      "name": "Test Template",
      "description": "test desc",
      "category": "certificados",
      "fileName": "test.docx",
      "fileKey": "dynamic-templates/test-key.docx",
      "fileData": "UEsDBBQAAAAIAA==", // minimal base64
      "fileSize": 100,
      "mimeType": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    }
  }
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/trpc/dynamicDocuments.createTemplate?batch=1',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    // We need a valid session cookie - skip this test
  }
};

console.log('This test requires authentication. Let me check the server logs instead.');
console.log('Looking at the error more carefully...');

// The error message from the screenshot shows:
// "Failed query: insert into `dynamic_doc_templates` (`id`, `name`, `description`, `category`, `fileName`, `fileKey`, `fileUrl`, `fileSize`, `mimeType`, `isActive`, `uploadedBy`, `createdAt`, `updatedAt`) values (default, ?, ?, ?, ?, ?, ?, ?, ?, default, ?, default, default)"
// params: certificado CNO 2121,documento cno 2121,certificados,CNO 2121 .docx,dynamic-templates/1775758517872-CNO 2121 .docx,https://res.cloudinary.com/...,...,application/vnd.openxmlformats-officedocument.wordprocessingml.document,206

// Count the ? placeholders: 9 (name, description, category, fileName, fileKey, fileUrl, fileSize, mimeType, uploadedBy)
// Count the params: name=certificado CNO 2121, description=documento cno 2121, category=certificados, fileName=CNO 2121 .docx, fileKey=dynamic-templates/..., fileUrl=https://..., fileSize=29127, mimeType=application/..., uploadedBy=206

// That's 9 params for 9 ? placeholders. Looks correct.
// The error might be about the fileSize being too large or the URL being too long

// Let me check if the issue is that storagePut returns a URL that's too long for the column
// But fileUrl is TEXT, so it should be fine...

// Wait - looking at the error again, it says "Failed query" but doesn't show the actual SQL error
// The issue might be that the server is crashing or the error is not properly caught
console.log('The error might be a connection issue or timeout, not a schema issue.');

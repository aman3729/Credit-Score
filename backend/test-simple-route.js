import express from 'express';

const app = express();

// Simple test route
app.get('/api/v1/schema-mapping/fields', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Test route working',
    data: { test: 'fields' }
  });
});

app.listen(3002, () => {
  console.log('Simple test server running on port 3002');
  console.log('Test the endpoint: GET http://localhost:3002/api/v1/schema-mapping/fields');
}); 
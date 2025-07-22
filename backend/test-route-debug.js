import express from 'express';
import schemaMappingRoutes from './routes/schemaMappingRoutes.js';

const app = express();
app.use('/api/v1/schema-mapping', schemaMappingRoutes);

// Test route
app.get('/test', (req, res) => {
  res.json({ message: 'Test route working' });
});

app.listen(3001, () => {
  console.log('Test server running on port 3001');
  console.log('Available routes:');
  console.log('- GET /test');
  console.log('- GET /api/v1/schema-mapping/fields');
  console.log('- POST /api/v1/schema-mapping/detect-fields');
}); 
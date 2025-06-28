import axios from 'axios';
import jwt from 'jsonwebtoken';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

// Configuration
const API_BASE_URL = 'http://localhost:3000/api';
const JWT_SECRET = 'your_jwt_secret';
const TEST_EMAIL = 'amanabraham724@gmail.com';

// Create a test user token
const createTestToken = (userId = 'test-user-id') => {
  return jwt.sign({ id: userId, role: 'admin' }, JWT_SECRET);
};

// Test the credit data endpoint
const testCreditDataEndpoint = async () => {
  try {
    console.log('Testing credit data endpoint...');
    
    // Get admin token
    const token = createTestToken();
    
    // Make request to credit data endpoint
    const response = await axios.get(
      `${API_BASE_URL}/users/${encodeURIComponent(TEST_EMAIL)}/credit-data`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(response.data, null, 2));
    
    // Check if the response has the expected structure
    if (response.data && response.data.data) {
      console.log('✅ Success: Response has expected data structure');
      console.log('User data:', response.data.data.user);
      console.log('Credit scores count:', response.data.data.creditScores?.length || 0);
    } else {
      console.log('❌ Unexpected response structure:', response.data);
    }
    
  } catch (error) {
    console.error('Error testing credit data endpoint:');
    
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received:', error.request);
    } else {
      // Something happened in setting up the request
      console.error('Error:', error.message);
    }
  }
};

// Run the test
testCreditDataEndpoint();

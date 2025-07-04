import mongoose from 'mongoose';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';

// Load environment variables
dotenv.config();

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Generate a test JWT token for admin user
const generateTestToken = () => {
  const payload = {
    id: '507f1f77bcf86cd799439011', // Example admin user ID
    email: 'admin@creditdashboard.com',
    role: 'admin'
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Test the save decision endpoint
const testSaveDecision = async () => {
  try {
    const token = generateTestToken();
    console.log('🔑 Generated test token:', token.substring(0, 20) + '...');
    
    const testData = {
      decision: 'Approve',
      notes: 'Test manual decision - approved based on strong credit history',
      loanDetails: {
        amount: 5000,
        term: 12,
        interestRate: 8.5
      },
      isManual: true,
      reasons: ['Strong credit score', 'Good payment history'],
      recommendations: ['Eligible for standard rates', 'Consider increasing loan amount'],
      maxLoanAmount: 10000,
      suggestedInterestRate: 8.5,
      debtToIncomeRatio: 0.25
    };
    
    console.log('📤 Test data:', JSON.stringify(testData, null, 2));
    
    // Make the API call
    const response = await fetch(`http://localhost:3000/api/v1/lenders/save-decision/507f1f77bcf86cd799439011`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(testData)
    });
    
    const result = await response.json();
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response data:', JSON.stringify(result, null, 2));
    
    if (response.ok) {
      console.log('✅ Save decision test passed!');
    } else {
      console.log('❌ Save decision test failed!');
    }
    
  } catch (error) {
    console.error('❌ Test error:', error);
  }
};

// Run the test
const runTest = async () => {
  await connectDB();
  await testSaveDecision();
  process.exit(0);
};

runTest(); 
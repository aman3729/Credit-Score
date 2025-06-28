const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const CreditScore = require('../models/CreditScore');
const { connectDB } = require('../config/db');

// Connect to MongoDB
connectDB();

// Sample users data
const users = [
  {
    name: 'Admin User',
    email: 'admin@example.com',
    password: 'password123',
    role: 'admin',
    emailVerified: true
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    password: 'password123',
    role: 'user',
    emailVerified: true
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    password: 'password123',
    role: 'lender',
    emailVerified: true
  }
];

// Sample credit score factors
const getRandomFactors = () => {
  const factors = [
    'Payment History',
    'Credit Utilization',
    'Length of Credit History',
    'New Credit',
    'Credit Mix'
  ];
  
  const statuses = ['positive', 'neutral', 'negative'];
  const impacts = ['high', 'medium', 'low'];
  
  return factors.map(factor => ({
    factor,
    status: statuses[Math.floor(Math.random() * statuses.length)],
    impact: impacts[Math.floor(Math.random() * impacts.length)],
    description: `Details about ${factor.toLowerCase()}`
  }));
};

// Generate random credit scores for a user
const generateCreditScores = (userId, count = 12) => {
  const scores = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const score = Math.floor(Math.random() * 150) + 600; // 600-750
    const date = new Date(now);
    date.setMonth(now.getMonth() - (count - i - 1));
    
    scores.push({
      user: userId,
      score,
      factors: getRandomFactors(),
      reportDate: date,
      details: {
        paymentHistory: Math.floor(Math.random() * 30) + 70, // 70-100
        creditUtilization: Math.floor(Math.random() * 70) + 10, // 10-80
        creditHistoryLength: Math.floor(Math.random() * 50) + 30, // 30-80
        newCredit: Math.floor(Math.random() * 70) + 10, // 10-80
        creditMix: Math.floor(Math.random() * 40) + 50 // 50-90
      },
      metadata: {
        bureau: ['experian', 'equifax', 'transunion'][Math.floor(Math.random() * 3)],
        pullDate: date
      }
    });
  }
  
  return scores;
};

const seedDB = async () => {
  try {
    // Clear existing data
    await User.deleteMany({});
    await CreditScore.deleteMany({});
    console.log('Database cleared');
    
    // Create users
    const createdUsers = [];
    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = await User.create({
        ...user,
        password: hashedPassword
      });
      createdUsers.push(newUser);
      console.log(`User created: ${newUser.email}`);
    }
    
    // Create credit scores for each user
    for (const user of createdUsers) {
      const creditScores = generateCreditScores(user._id);
      await CreditScore.insertMany(creditScores);
      console.log(`Created ${creditScores.length} credit scores for ${user.email}`);
    }
    
    console.log('Database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDB();

require('dns').setDefaultResultOrder('ipv4first');
import mongoose from 'mongoose';
import 'dotenv/config';

const uri = process.env.MONGODB_URI;
console.log('Testing Mongoose connection...');
mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 })
  .then(() => {
    console.log('✅ Mongoose connected successfully!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Mongoose connection failed:', err.message);
    process.exit(1);
  });
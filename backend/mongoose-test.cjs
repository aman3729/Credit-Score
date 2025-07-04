const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require('dotenv').config();

const mongoose = require('mongoose');

console.log('Testing Mongoose connection...');

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 10000,
})
.then(() => {
  console.log('✅ Mongoose connected!');
  process.exit(0);
})
.catch(err => {
  console.error('❌ Mongoose connection failed:', err.message);
  process.exit(1);
});

import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

// Check if MONGODB_URI is set
const hasMongoURI = !!process.env.MONGODB_URI;

// Check if required environment variables are set
const requiredVars = [
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_EXPIRE',
  'JWT_COOKIE_EXPIRE',
  'ADMIN_EMAIL',
  'ADMIN_PASSWORD'
];

console.log('Environment Variables Check');
console.log('==========================');

// Check each required variable
requiredVars.forEach(varName => {
  const isSet = !!process.env[varName];
  const status = isSet ? '✅' : '❌';
  const value = isSet 
    ? varName.includes('PASSWORD') 
      ? '********' 
      : process.env[varName]
    : 'Not set';
  
  console.log(`${status} ${varName.padEnd(20)}: ${value}`);
});

// Check MongoDB connection string format
if (hasMongoURI) {
  console.log('\nMongoDB Connection String Analysis');
  console.log('===============================');
  
  const uri = process.env.MONGODB_URI;
  
  // Check for common issues
  const hasProtocol = uri.startsWith('mongodb://') || uri.startsWith('mongodb+srv://');
  const hasCredentials = uri.includes('@');
  const hasDatabase = uri.includes('?') 
    ? uri.split('/').pop().includes('?') 
    : uri.split('/').length > 3;
  
  console.log(`Protocol: ${hasProtocol ? '✅' : '❌'} ${hasProtocol ? 'Valid' : 'Invalid or missing protocol (should start with mongodb:// or mongodb+srv://)'}`);
  console.log(`Credentials: ${hasCredentials ? '✅' : '❌'} ${hasCredentials ? 'Included' : 'Missing credentials (username:password@)'}`);
  console.log(`Database: ${hasDatabase ? '✅' : '❌'} ${hasDatabase ? 'Specified' : 'No database specified in connection string'}`);
  
  // Check for common issues
  if (!uri.includes('retryWrites=true')) {
    console.log('⚠️  Warning: retryWrites=true not found in connection string. Recommended for better reliability.');
  }
  
  if (uri.includes('w=') && !uri.includes('w=majority')) {
    console.log('⚠️  Warning: Write concern is not set to majority. Recommended for production.');
  }
  
  if (uri.includes('ssl=') && !uri.includes('ssl=true')) {
    console.log('⚠️  Warning: SSL is disabled in connection string. Not recommended for production.');
  }
}

// Check for common issues
console.log('\nCommon Issues');
console.log('=============');

// Check if .env file exists
const fs = require('fs');
const path = require('path');
const envPath = path.join(process.cwd(), '.env');

if (!fs.existsSync(envPath)) {
  console.log('❌ .env file not found in the backend directory');
  console.log('   Please create a .env file with the required environment variables');
} else {
  console.log('✅ .env file found');
  
  // Check if .env is in .gitignore
  const gitignorePath = path.join(process.cwd(), '..', '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    if (!gitignore.includes('.env')) {
      console.log('⚠️  Warning: .env file is not in .gitignore. This is a security risk.');
    }
  }
}

// Check Node.js version
const nodeVersion = process.version;
const majorVersion = parseInt(nodeVersion.replace(/[^0-9.]/g, '').split('.')[0]);

if (majorVersion < 14) {
  console.log(`❌ Unsupported Node.js version: ${nodeVersion}. Version 14 or higher is required.`);
} else {
  console.log(`✅ Node.js version: ${nodeVersion}`);
}

// Check if running in development mode
if (process.env.NODE_ENV !== 'production') {
  console.log('ℹ️  Running in development mode. Set NODE_ENV=production for production.');
}

console.log('\nEnvironment check completed.');

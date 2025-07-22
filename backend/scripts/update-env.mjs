import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the .env file
const envPath = path.resolve(__dirname, '../.env');

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ .env file not found. Please create one in the backend directory.');
  process.exit(1);
}

// Read the current .env file
const envConfig = dotenv.parse(fs.readFileSync(envPath));

// Update the MONGODB_URI to include the database name
const currentUri = envConfig.MONGODB_URI || '';

// Check if the URI already has a database name
const hasDbName = /\/[^/\s?]+(\?|$)/.test(currentUri);

if (hasDbName) {
  console.log('✅ MONGODB_URI already includes a database name');
  console.log('Current MONGODB_URI (masked):', currentUri.replace(/(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1$3:*****@'));
} else {
  // Add the database name to the connection string
  const newUri = currentUri.endsWith('/') 
    ? `${currentUri}credit-score-dashboard` 
    : `${currentUri}/credit-score-dashboard`;
  
  // Update the environment variable
  envConfig.MONGODB_URI = newUri;
  
  // Write the updated .env file
  const envContent = Object.entries(envConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');
  
  fs.writeFileSync(envPath, envContent);
  
  console.log('✅ Updated MONGODB_URI to include database name');
  console.log('New MONGODB_URI (masked):', newUri.replace(/(mongodb(\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1$3:*****@'));
}

console.log('\nTo apply these changes, restart your server.');

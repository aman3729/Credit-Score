import { writeFileSync } from 'fs';
import { config } from 'dotenv';

const output = [];

function log(...args) {
  const message = args.join(' ');
  output.push(message);
  console.log(message);
}

// Test basic functionality
log('=== Starting Test ===');
log(`Node.js version: ${process.version}`);
log(`Current directory: ${process.cwd()}`);

// Test environment variables
log('\n=== Environment Variables ===');
const envPath = new URL('.env', import.meta.url).pathname.replace(/^\/([A-Z]:\/)/, '$1');
log(`Loading .env from: ${envPath}`);

try {
  const result = config({ path: envPath });
  if (result.error) {
    log(`❌ Error loading .env: ${result.error.message}`);
  } else {
    log('✅ .env file loaded successfully');
    log(`MONGODB_URI: ${process.env.MONGODB_URI ? '***' : 'Not set'}`);
    log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'Not set'}`);
    log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  }
} catch (err) {
  log(`❌ Error: ${err.message}`);
}

// Write output to file
try {
  writeFileSync('test-output.txt', output.join('\n'), 'utf8');
  log('\nOutput written to test-output.txt');
} catch (err) {
  console.error('Failed to write output file:', err);
}

log('\n=== Test Complete ===');

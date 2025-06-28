import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';
import { writeFileSync } from 'fs';

// Get the current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Output file
const outputFile = path.join(process.cwd(), 'env-output.txt');
const output = [];

function log(...args) {
  const message = args.join(' ');
  console.log(message);
  output.push(message);
}

// Load environment variables from .env file
const envPath = path.resolve(process.cwd(), '.env');
log('Loading environment from:', envPath);

try {
  const { error } = config({ path: envPath });
  if (error) {
    throw new Error(`Failed to load .env file: ${error.message}`);
  }

  // Log important environment variables (without sensitive data)
  log('\n=== Environment Variables ===');
  log(`NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
  log(`MONGODB_URI: ${process.env.MONGODB_URI ? '***' : 'Not set'}`);
  log(`JWT_SECRET: ${process.env.JWT_SECRET ? '***' : 'Not set'}`);
  log(`SESSION_SECRET: ${process.env.SESSION_SECRET ? '***' : 'Not set'}`);
  log(`FRONTEND_URL: ${process.env.FRONTEND_URL || 'Not set'}`);
  
  // Log all environment variables (for debugging)
  log('\n=== All Environment Variables ===');
  Object.entries(process.env)
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([key, value]) => {
      const isSensitive = ['SECRET', 'PASSWORD', 'KEY', 'TOKEN', 'PASS', 'AUTH'].some(term => 
        key.toUpperCase().includes(term)
      );
      log(`${key}=${isSensitive ? '***' : value}`);
    });
  
  log('\n=== Environment Check Complete ===');
  log(`Output saved to: ${outputFile}`);
  
} catch (error) {
  log('\n❌ Error:', error.message);
  process.exitCode = 1;
  
} finally {
  // Write output to file
  try {
    writeFileSync(outputFile, output.join('\n'), 'utf8');
  } catch (err) {
    console.error('Failed to write output file:', err);
  }
}

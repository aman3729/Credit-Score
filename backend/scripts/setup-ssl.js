import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// SSL directory path
const sslDir = path.join(__dirname, '..', 'ssl');

// Create SSL directory if it doesn't exist
if (!fs.existsSync(sslDir)) {
  fs.mkdirSync(sslDir, { recursive: true });
  console.log('✅ Created SSL directory');
}

// Check for SSL certificates
const requiredFiles = ['private.key', 'certificate.crt', 'ca_bundle.crt'];

console.log('🔍 Checking SSL certificates...');

const missingFiles = [];

requiredFiles.forEach(file => {
  const filePath = path.join(sslDir, file);
  if (!fs.existsSync(filePath)) {
    missingFiles.push(file);
    console.log(`❌ Missing: ${file}`);
  } else {
    console.log(`✅ Found: ${file}`);
  }
});

if (missingFiles.length > 0) {
  console.log('\n📋 SSL Setup Instructions:');
  console.log('==========================');
  console.log('For production deployment, you need to obtain SSL certificates:');
  console.log('');
  console.log('1. Purchase SSL certificates from a trusted CA (e.g., DigiCert, Let\'s Encrypt)');
  console.log('2. Download the following files and place them in the ssl/ directory:');
  console.log('');
  missingFiles.forEach(file => {
    console.log(`   - ${file}`);
  });
  console.log('');
  console.log('3. File descriptions:');
  console.log('   - private.key: Your private key file');
  console.log('   - certificate.crt: Your server certificate');
  console.log('   - ca_bundle.crt: Certificate Authority bundle');
  console.log('');
  console.log('4. For development/testing, you can generate self-signed certificates:');
  console.log('   openssl req -x509 -newkey rsa:4096 -keyout ssl/private.key -out ssl/certificate.crt -days 365 -nodes');
  console.log('');
  console.log('⚠️  Note: Self-signed certificates are NOT suitable for production use!');
} else {
  console.log('\n✅ All SSL certificates are present!');
  console.log('Your server is ready for HTTPS in production mode.');
}

// Create a sample .env template for SSL
const envTemplate = `# SSL Configuration
NODE_ENV=production
PORT=443
HOST=0.0.0.0

# JWT Secrets (REQUIRED - Generate strong secrets!)
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here

# CORS Configuration
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com

# Database
MONGODB_URI=your_mongodb_connection_string

# Email Configuration
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password

# Other configurations...
`;

const envPath = path.join(__dirname, '..', '.env.production.template');
if (!fs.existsSync(envPath)) {
  fs.writeFileSync(envPath, envTemplate);
  console.log('\n📝 Created .env.production.template file');
  console.log('Copy this file to .env.production and update with your values');
}

console.log('\n🚀 SSL setup check complete!'); 
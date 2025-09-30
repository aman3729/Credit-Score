# SSL Certificate Setup Guide

## 🔒 SSL Certificate Options

### 1. **Let's Encrypt (FREE - Recommended for Development/Testing)**

#### Prerequisites
- Domain name pointing to your server
- Server accessible from the internet
- SSH access to your server

#### Installation Steps

**Option A: Using Certbot (Recommended)**
```bash
# Install Certbot
sudo apt update
sudo apt install certbot

# Get certificate for your domain
sudo certbot certonly --standalone -d your-domain.com -d www.your-domain.com

# Certificates will be saved to:
# /etc/letsencrypt/live/your-domain.com/fullchain.pem
# /etc/letsencrypt/live/your-domain.com/privkey.pem
```

**Option B: Using Certbot with Nginx**
```bash
# Install Certbot with Nginx plugin
sudo apt install certbot python3-certbot-nginx

# Get certificate with automatic Nginx configuration
sudo certbot --nginx -d your-domain.com
```

#### Auto-renewal Setup
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Add to crontab for automatic renewal
sudo crontab -e
# Add this line:
0 12 * * * /usr/bin/certbot renew --quiet
```

### 2. **Cloudflare SSL (FREE - Easy Setup)**

#### Setup Steps
1. **Sign up for Cloudflare** (free tier)
2. **Add your domain** to Cloudflare
3. **Update nameservers** at your domain registrar
4. **Enable SSL/TLS** in Cloudflare dashboard:
   - Go to SSL/TLS settings
   - Set encryption mode to "Full" or "Full (strict)"
5. **Configure your server** to use Cloudflare's SSL

#### Server Configuration
```javascript
// In your server.js, use HTTP instead of HTTPS
// Cloudflare will handle SSL termination
const server = http.createServer(app);
```

### 3. **Paid SSL Certificates (Production)**

#### Popular Providers
- **DigiCert** - Enterprise-grade, high trust
- **Comodo** - Affordable, good support
- **GlobalSign** - High security standards
- **Sectigo** - Cost-effective options

#### Purchase Process
1. **Generate CSR (Certificate Signing Request)**
```bash
# Generate private key
openssl genrsa -out private.key 2048

# Generate CSR
openssl req -new -key private.key -out certificate.csr
```

2. **Submit CSR to certificate provider**
3. **Download certificate files**
4. **Install on your server**

## 🚀 Quick Setup for Development

### Self-Signed Certificate (Development Only)
```bash
# Navigate to your backend directory
cd backend

# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout ssl/private.key -out ssl/certificate.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Create CA bundle (for self-signed, just copy the certificate)
cp ssl/certificate.crt ssl/ca_bundle.crt
```

### Test SSL Setup
```bash
# Run the SSL setup script
node scripts/setup-ssl.js

# Test the server with SSL
NODE_ENV=production npm start
```

## 🌐 Production Deployment Options

### Option 1: Direct SSL (Recommended for Small-Medium Apps)

#### Server Requirements
- VPS or dedicated server
- Domain name
- Public IP address

#### Setup Steps
1. **Deploy your application**
2. **Install Nginx as reverse proxy**
3. **Obtain SSL certificate** (Let's Encrypt recommended)
4. **Configure Nginx with SSL**

#### Nginx Configuration Example
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    # SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### Option 2: Cloud Platform SSL (Easiest)

#### Heroku
```bash
# Deploy to Heroku
git push heroku main

# SSL is automatically provided by Heroku
```

#### Vercel
```bash
# Deploy to Vercel
vercel --prod

# SSL is automatically provided by Vercel
```

#### Railway
```bash
# Deploy to Railway
railway up

# SSL is automatically provided by Railway
```

### Option 3: CDN with SSL (Recommended for Large Apps)

#### Cloudflare Setup
1. **Add domain to Cloudflare**
2. **Update nameservers**
3. **Enable SSL/TLS encryption**
4. **Configure page rules if needed**

#### AWS CloudFront
1. **Create CloudFront distribution**
2. **Upload SSL certificate to AWS Certificate Manager**
3. **Configure origin settings**
4. **Update DNS records**

## 🔧 Server Configuration

### Environment Variables
```bash
# Production environment
NODE_ENV=production
PORT=443
HOST=0.0.0.0
SSL_KEY_PATH=./ssl/private.key
SSL_CERT_PATH=./ssl/certificate.crt
SSL_CA_PATH=./ssl/ca_bundle.crt
```

### SSL Certificate Paths
```
backend/
├── ssl/
│   ├── private.key      # Private key file
│   ├── certificate.crt  # Server certificate
│   └── ca_bundle.crt    # CA bundle (optional for self-signed)
```

### Testing SSL Configuration
```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Check certificate expiry
openssl x509 -in ssl/certificate.crt -text -noout | grep "Not After"

# Test HTTPS endpoint
curl -k https://your-domain.com/api/v1/health
```

## 🛡️ Security Best Practices

### SSL Configuration
```javascript
// In server.js
const sslOptions = {
  key: fs.readFileSync(path.join(sslDir, 'private.key')),
  cert: fs.readFileSync(path.join(sslDir, 'certificate.crt')),
  ca: fs.readFileSync(path.join(sslDir, 'ca_bundle.crt')),
  // Security settings
  minVersion: 'TLSv1.2',
  maxVersion: 'TLSv1.3',
  ciphers: 'ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512',
  honorCipherOrder: true,
  requestCert: false,
  rejectUnauthorized: false
};
```

### Security Headers
```javascript
// Additional security headers
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    }
  }
}));
```

## 📋 SSL Setup Checklist

### Before Setup
- [ ] Domain name registered
- [ ] DNS records configured
- [ ] Server accessible from internet
- [ ] Firewall configured (port 80, 443)
- [ ] Backup strategy in place

### During Setup
- [ ] SSL certificate obtained
- [ ] Certificate files placed in ssl/ directory
- [ ] Server configured for HTTPS
- [ ] Security headers configured
- [ ] SSL certificate tested

### After Setup
- [ ] Auto-renewal configured (Let's Encrypt)
- [ ] Monitoring set up for certificate expiry
- [ ] Backup of certificate files
- [ ] Documentation updated
- [ ] Team notified of SSL implementation

## 🚨 Troubleshooting

### Common Issues

#### Certificate Not Found
```bash
# Check file permissions
ls -la ssl/
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt
```

#### SSL Handshake Failed
```bash
# Check certificate validity
openssl x509 -in ssl/certificate.crt -text -noout

# Test SSL connection
openssl s_client -connect localhost:443
```

#### Let's Encrypt Renewal Failed
```bash
# Check renewal logs
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew --force-renewal
```

### Emergency Procedures
1. **Certificate Expired**: Renew immediately or use backup
2. **Private Key Compromised**: Generate new certificate
3. **Server Compromised**: Revoke and regenerate certificates

## 📞 Support Resources

### Let's Encrypt
- **Documentation**: https://letsencrypt.org/docs/
- **Community**: https://community.letsencrypt.org/
- **Status**: https://letsencrypt.status.io/

### SSL Labs Testing
- **SSL Test**: https://www.ssllabs.com/ssltest/
- **SSL Configuration**: https://ssl-config.mozilla.org/

### Certificate Authorities
- **DigiCert**: https://www.digicert.com/
- **Comodo**: https://www.comodo.com/
- **GlobalSign**: https://www.globalsign.com/

---

**Last Updated**: July 28, 2025
**Version**: 1.0
**Status**: ✅ Complete 
# SSL Certificate Setup Guide

## 🚀 Quick Start Options

### Option 1: Let's Encrypt (FREE - Recommended)

#### Step 1: Prerequisites
- Domain name pointing to your server
- Server accessible from internet
- SSH access to server

#### Step 2: Install Certbot
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install certbot

# CentOS/RHEL
sudo yum install certbot
```

#### Step 3: Get Certificate
```bash
# Standalone mode (stops web server temporarily)
sudo certbot certonly --standalone -d your-domain.com

# Or with Nginx (if using Nginx)
sudo certbot --nginx -d your-domain.com
```

#### Step 4: Copy Certificates
```bash
# Copy to your project
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem backend/ssl/private.key
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem backend/ssl/certificate.crt
sudo cp /etc/letsencrypt/live/your-domain.com/chain.pem backend/ssl/ca_bundle.crt

# Set permissions
chmod 600 backend/ssl/private.key
chmod 644 backend/ssl/certificate.crt
chmod 644 backend/ssl/ca_bundle.crt
```

#### Step 5: Auto-renewal
```bash
# Test renewal
sudo certbot renew --dry-run

# Add to crontab
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Option 2: Self-Signed (Development Only)

```bash
# Generate self-signed certificate
openssl req -x509 -newkey rsa:4096 -keyout backend/ssl/private.key -out backend/ssl/certificate.crt -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Copy certificate as CA bundle
cp backend/ssl/certificate.crt backend/ssl/ca_bundle.crt
```

### Option 3: Cloudflare (FREE - Easiest)

1. **Sign up at cloudflare.com**
2. **Add your domain**
3. **Update nameservers at your domain registrar**
4. **Enable SSL/TLS in Cloudflare dashboard**
5. **Set encryption mode to "Full"**

## 🔧 Server Configuration

### Environment Variables
```bash
# .env.production
NODE_ENV=production
PORT=443
HOST=0.0.0.0
JWT_SECRET=your_strong_jwt_secret
JWT_REFRESH_SECRET=your_strong_refresh_secret
CORS_ORIGINS=https://your-domain.com
MONGODB_URI=your_production_mongodb_uri
```

### Test SSL Setup
```bash
# Run SSL setup check
node backend/scripts/setup-ssl.js

# Start production server
NODE_ENV=production npm start

# Test HTTPS
curl -k https://localhost:443/api/v1/health
```

## 🌐 Production Deployment

### Option 1: Direct Server
1. **Deploy to VPS** (DigitalOcean, AWS, etc.)
2. **Install Node.js and dependencies**
3. **Set up SSL certificates** (Let's Encrypt)
4. **Configure firewall** (ports 80, 443)
5. **Set up process manager** (PM2)

### Option 2: Cloud Platforms
- **Heroku**: Automatic SSL
- **Vercel**: Automatic SSL  
- **Railway**: Automatic SSL
- **Render**: Automatic SSL

### Option 3: Nginx Reverse Proxy
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🛡️ Security Checklist

### Before Deployment
- [ ] SSL certificates obtained
- [ ] Environment variables configured
- [ ] Security headers enabled
- [ ] Rate limiting configured
- [ ] Input validation implemented

### After Deployment
- [ ] HTTPS working correctly
- [ ] SSL certificate valid
- [ ] Security headers present
- [ ] Auto-renewal configured
- [ ] Monitoring set up

## 🚨 Troubleshooting

### Common Issues
```bash
# Certificate not found
ls -la backend/ssl/

# Permission issues
chmod 600 backend/ssl/private.key

# Test SSL connection
openssl s_client -connect localhost:443

# Check certificate expiry
openssl x509 -in backend/ssl/certificate.crt -text -noout | grep "Not After"
```

### Emergency Procedures
1. **Certificate expired**: Renew immediately
2. **Private key compromised**: Generate new certificate
3. **Server compromised**: Revoke and regenerate

## 📞 Quick Commands

```bash
# Check SSL setup
node backend/scripts/setup-ssl.js

# Security audit
npm audit

# Start production server
NODE_ENV=production npm start

# Test HTTPS endpoint
curl -k https://your-domain.com/api/v1/health
```

---

**Status**: ✅ Ready for Production
**Next Step**: Choose SSL option and deploy 
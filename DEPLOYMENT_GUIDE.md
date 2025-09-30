# Production Deployment Guide

## 🚀 **Quick Start: Railway (Recommended)**

### **Step 1: Prepare Your Repository**
```bash
# Ensure your code is committed to GitHub
git add .
git commit -m "Production ready with security fixes"
git push origin main
```

### **Step 2: Set Up Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Initialize Railway project
railway init

# Add your GitHub repository
railway link
```

### **Step 3: Configure Environment Variables**
```bash
# Set production environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=your_strong_jwt_secret_here
railway variables set JWT_REFRESH_SECRET=your_strong_refresh_secret_here
railway variables set MONGODB_URI=your_mongodb_atlas_uri
railway variables set CORS_ORIGINS=https://your-domain.com
```

### **Step 4: Deploy**
```bash
# Deploy to Railway
railway up

# Check deployment status
railway status

# View logs
railway logs
```

### **Step 5: Get Your URL**
```bash
# Get your production URL
railway domain
```

**✅ Railway automatically provides SSL certificates!**

---

## 🌐 **Alternative: Render**

### **Step 1: Create Render Account**
1. Go to [render.com](https://render.com)
2. Sign up with GitHub
3. Create a new account

### **Step 2: Create Web Service**
1. Click "New +" → "Web Service"
2. Connect your GitHub repository
3. Configure settings:
   - **Name**: credit-score-api
   - **Environment**: Node
   - **Build Command**: `cd backend && npm install`
   - **Start Command**: `cd backend && npm start`
   - **Plan**: Free (or paid for production)

### **Step 3: Set Environment Variables**
In Render dashboard, go to Environment → Environment Variables:
```bash
NODE_ENV=production
JWT_SECRET=your_strong_jwt_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
MONGODB_URI=your_mongodb_atlas_uri
CORS_ORIGINS=https://your-domain.com
PORT=10000
```

### **Step 4: Deploy**
1. Click "Create Web Service"
2. Render will automatically deploy
3. Wait for build to complete
4. Get your production URL

**✅ Render automatically provides SSL certificates!**

---

## 💻 **VPS Option: DigitalOcean**

### **Step 1: Create Droplet**
1. Go to [digitalocean.com](https://digitalocean.com)
2. Create account and add payment method
3. Click "Create" → "Droplets"
4. Choose:
   - **Distribution**: Ubuntu 22.04 LTS
   - **Plan**: Basic ($5/month)
   - **Datacenter**: Choose closest to users
   - **Authentication**: SSH key (recommended) or password

### **Step 2: Connect to Server**
```bash
# SSH into your server
ssh root@your_server_ip

# Update system
apt update && apt upgrade -y
```

### **Step 3: Install Node.js**
```bash
# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

### **Step 4: Install PM2 (Process Manager)**
```bash
# Install PM2 globally
npm install -g pm2

# Install PM2 startup script
pm2 startup
```

### **Step 5: Clone and Setup Application**
```bash
# Install Git
apt install git -y

# Clone your repository
git clone https://github.com/your-username/credit-score-dashboard.git
cd credit-score-dashboard/backend

# Install dependencies
npm install

# Create production environment file
nano .env.production
```

### **Step 6: Configure Environment Variables**
```bash
# Add to .env.production
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
JWT_SECRET=your_strong_jwt_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
MONGODB_URI=your_mongodb_atlas_uri
CORS_ORIGINS=https://your-domain.com
```

### **Step 7: Set Up SSL with Let's Encrypt**
```bash
# Install Certbot
apt install certbot -y

# Stop any running web server
systemctl stop nginx

# Get SSL certificate
certbot certonly --standalone -d your-domain.com

# Copy certificates to your project
cp /etc/letsencrypt/live/your-domain.com/privkey.pem ssl/private.key
cp /etc/letsencrypt/live/your-domain.com/fullchain.pem ssl/certificate.crt
cp /etc/letsencrypt/live/your-domain.com/chain.pem ssl/ca_bundle.crt

# Set proper permissions
chmod 600 ssl/private.key
chmod 644 ssl/certificate.crt
chmod 644 ssl/ca_bundle.crt
```

### **Step 8: Configure Firewall**
```bash
# Install UFW
apt install ufw -y

# Allow SSH, HTTP, and HTTPS
ufw allow ssh
ufw allow 80
ufw allow 443

# Enable firewall
ufw enable
```

### **Step 9: Start Application**
```bash
# Start with PM2
pm2 start server.js --name "credit-score-api"

# Save PM2 configuration
pm2 save

# Check status
pm2 status
pm2 logs
```

### **Step 10: Set Up Auto-renewal**
```bash
# Test renewal
certbot renew --dry-run

# Add to crontab
crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

---

## 🔧 **Environment Variables Setup**

### **Required Variables for All Platforms**
```bash
NODE_ENV=production
JWT_SECRET=your_very_strong_secret_here_make_it_long_and_random
JWT_REFRESH_SECRET=your_very_strong_refresh_secret_here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
CORS_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

### **Optional Variables**
```bash
PORT=3000
HOST=0.0.0.0
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

---

## 🧪 **Testing Your Deployment**

### **Health Check**
```bash
# Test your API health endpoint
curl https://your-domain.com/api/v1/health
```

### **Security Test**
```bash
# Test SSL certificate
openssl s_client -connect your-domain.com:443 -servername your-domain.com

# Test security headers
curl -I https://your-domain.com/api/v1/health
```

### **API Test**
```bash
# Test authentication endpoint
curl -X POST https://your-domain.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"Admin123!"}'
```

---

## 📊 **Monitoring Setup**

### **Basic Monitoring Commands**
```bash
# Check application status
pm2 status

# View logs
pm2 logs

# Monitor resources
pm2 monit

# Restart application
pm2 restart credit-score-api
```

### **SSL Certificate Monitoring**
```bash
# Check certificate expiry
openssl x509 -in ssl/certificate.crt -text -noout | grep "Not After"

# Test auto-renewal
certbot renew --dry-run
```

---

## 🚨 **Troubleshooting**

### **Common Issues**

#### **Application Won't Start**
```bash
# Check logs
pm2 logs

# Check environment variables
pm2 env credit-score-api

# Restart application
pm2 restart credit-score-api
```

#### **SSL Certificate Issues**
```bash
# Check certificate validity
openssl x509 -in ssl/certificate.crt -text -noout

# Renew certificate manually
certbot renew --force-renewal
```

#### **Database Connection Issues**
```bash
# Test MongoDB connection
node -e "const mongoose = require('mongoose'); mongoose.connect(process.env.MONGODB_URI).then(() => console.log('Connected')).catch(console.error)"
```

---

## 🎯 **Next Steps After Deployment**

1. **Test all endpoints** thoroughly
2. **Set up monitoring** and alerting
3. **Configure backups** for database
4. **Set up CI/CD** pipeline
5. **Document deployment** process
6. **Train team** on deployment procedures

---

**Which platform would you like to deploy to?** I can provide more specific instructions for your chosen platform. 
# Email Verification System Setup Guide

## Overview

Your credit score dashboard has a complete email verification system that ensures users verify their email addresses before accessing the application. This guide will help you set up and test the email verification functionality.

## 🚀 Quick Start

### 1. Environment Configuration

Add these environment variables to your `.env` file:

```bash
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

# Frontend URL (for verification links)
FRONTEND_URL=http://localhost:5173

# Email Verification Settings
REQUIRE_EMAIL_VERIFICATION=true
SKIP_EMAIL_VERIFICATION=false

# Optional: For development/testing
NODE_ENV=development
```

### 2. Gmail Setup (Recommended)

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account Settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
3. **Use the app password** in your `SMTP_PASS` environment variable

### 3. Test the Email System

Run the email verification test script:

```bash
cd backend
node scripts/test-email-verification.js
```

## 📧 Email Verification Flow

### Registration Process

1. **User registers** with email and password
2. **System creates** verification token (24-hour expiry)
3. **Verification email** is sent with secure link
4. **User clicks link** to verify email
5. **Account activated** and user can login

### Login Process

1. **User attempts login** with email/password
2. **System checks** if email is verified
3. **If verified**: Login successful
4. **If not verified**: Error message with resend option

## 🔧 Backend Implementation

### Key Components

#### 1. User Model (`backend/models/User.js`)
```javascript
emailVerified: {
  type: Boolean,
  default: false
},
emailVerificationToken: String,
emailVerificationTokenExpires: Date,
```

#### 2. Auth Routes (`backend/routes/auth.js`)
- `POST /api/v1/auth/register` - Creates user with verification token
- `GET /api/v1/auth/verify-email/:token` - Verifies email
- `POST /api/v1/auth/resend-verification` - Resends verification email

#### 3. Email Service (`backend/config/email.js`)
- SMTP configuration
- Email templates
- Send email function

#### 4. Email Templates (`backend/views/emails/emailVerification.pug`)
- Professional HTML email template
- Responsive design
- Security warnings

## 🎨 Frontend Implementation

### Key Components

#### 1. Registration Form (`frontend/src/components/Register.jsx`)
- Collects user information
- Handles registration API call
- Shows verification message

#### 2. Email Verification (`frontend/src/components/EmailVerification.jsx`)
- Handles verification token from URL
- Shows verification status
- Redirects to dashboard on success

#### 3. Email Verification Banner (`frontend/src/components/EmailVerificationBanner.jsx`)
- Shows for unverified users
- Provides resend verification option
- Displays in dashboard

#### 4. Auth Service (`frontend/src/services/authService.js`)
- Handles registration API calls
- Manages authentication state
- Token management

## 🔐 Security Features

### Token Security
- **32-byte random tokens** generated using crypto
- **SHA-256 hashing** for token storage
- **24-hour expiration** for verification links
- **One-time use** tokens (cleared after verification)

### Rate Limiting
- **Verification attempts** limited to prevent abuse
- **Resend verification** rate limited
- **Login attempts** rate limited

### Email Security
- **HTTPS links** for verification
- **Secure SMTP** configuration
- **No sensitive data** in email content

## 🧪 Testing

### 1. Manual Testing

#### Test Registration Flow:
1. Register a new user
2. Check email for verification link
3. Click verification link
4. Verify user can login

#### Test Login with Unverified Email:
1. Register user but don't verify
2. Try to login
3. Should see verification required message

#### Test Resend Verification:
1. Login with unverified account
2. Click "Resend Verification"
3. Check for new email

### 2. Automated Testing

Run the comprehensive test suite:

```bash
# Test email verification system
node scripts/test-email-verification.js

# Test email sending
node scripts/test-email.js

# Test user verification
node scripts/verify-user.js
```

### 3. Test Scenarios

#### ✅ Valid Scenarios:
- New user registration with email verification
- Email verification with valid token
- Resend verification email
- Login after email verification

#### ❌ Invalid Scenarios:
- Login without email verification
- Verification with expired token
- Verification with invalid token
- Multiple verification attempts

## 🚨 Troubleshooting

### Common Issues

#### 1. Email Not Sending
```bash
# Check SMTP configuration
node scripts/test-email.js

# Verify environment variables
echo $SMTP_HOST
echo $SMTP_USER
echo $SMTP_PASS
```

#### 2. Verification Link Not Working
```bash
# Check token in database
node scripts/check-user.js

# Verify token expiration
db.users.findOne({email: "user@example.com"})
```

#### 3. Frontend Not Receiving Verification
```bash
# Check API endpoint
curl -X GET "http://localhost:3000/api/v1/auth/verify-email/test-token"

# Check frontend route
# Ensure /verify-email route is configured in App.jsx
```

### Debug Commands

```bash
# Check email configuration
node scripts/check-env.mjs

# Test MongoDB connection
node scripts/test-mongodb.js

# List all users and verification status
node scripts/list-users.js

# Check specific user verification status
node scripts/check-user.js
```

## 🔄 Production Deployment

### 1. Environment Variables
```bash
# Production email settings
SMTP_HOST=smtp.provider.com
SMTP_PORT=587
SMTP_USER=your-production-email
SMTP_PASS=your-production-password
SMTP_FROM=noreply@yourdomain.com

# Production URLs
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Security settings
REQUIRE_EMAIL_VERIFICATION=true
NODE_ENV=production
```

### 2. Email Provider Options

#### Gmail (Free)
- Good for development/testing
- 500 emails/day limit
- Requires app password

#### SendGrid (Recommended)
- 100 emails/day free
- Better deliverability
- Professional features

#### AWS SES
- Very cost-effective
- High deliverability
- Requires AWS setup

### 3. Monitoring

#### Email Delivery Monitoring
- Check email delivery rates
- Monitor bounce rates
- Track verification completion rates

#### Security Monitoring
- Monitor failed verification attempts
- Track rate limit violations
- Log suspicious activity

## 📊 Analytics

### Key Metrics to Track

1. **Registration Rate**: Users who complete registration
2. **Verification Rate**: Users who verify their email
3. **Email Delivery Rate**: Successful email sends
4. **Resend Rate**: Users requesting new verification emails
5. **Conversion Rate**: Verified users who become active

### Example Queries

```javascript
// Users who registered but didn't verify
db.users.find({
  emailVerified: false,
  createdAt: { $gte: new Date(Date.now() - 7*24*60*60*1000) }
})

// Verification rate by day
db.users.aggregate([
  {
    $group: {
      _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
      total: { $sum: 1 },
      verified: { $sum: { $cond: ["$emailVerified", 1, 0] } }
    }
  }
])
```

## 🎯 Best Practices

### 1. User Experience
- Clear error messages for verification issues
- Easy resend verification option
- Helpful instructions in verification emails
- Graceful handling of expired tokens

### 2. Security
- Use HTTPS for all verification links
- Implement rate limiting
- Log security events
- Regular token cleanup

### 3. Email Design
- Professional branding
- Clear call-to-action buttons
- Mobile-responsive design
- Fallback text content

### 4. Monitoring
- Track email delivery rates
- Monitor verification completion
- Alert on unusual activity
- Regular security audits

## 🔧 Configuration Options

### Environment Variables Reference

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `SMTP_HOST` | SMTP server hostname | - | Yes |
| `SMTP_PORT` | SMTP server port | 587 | Yes |
| `SMTP_USER` | SMTP username | - | Yes |
| `SMTP_PASS` | SMTP password | - | Yes |
| `SMTP_FROM` | From email address | - | Yes |
| `FRONTEND_URL` | Frontend application URL | - | Yes |
| `REQUIRE_EMAIL_VERIFICATION` | Require email verification | true | No |
| `SKIP_EMAIL_VERIFICATION` | Skip email verification (dev) | false | No |

### Feature Flags

```javascript
// Disable email verification for development
SKIP_EMAIL_VERIFICATION=true

// Require email verification for production
REQUIRE_EMAIL_VERIFICATION=true

// Custom verification expiry (in hours)
EMAIL_VERIFICATION_EXPIRY=24
```

## 📞 Support

If you encounter issues with the email verification system:

1. **Check the logs** for detailed error messages
2. **Run the test scripts** to identify the issue
3. **Verify environment variables** are correctly set
4. **Test email configuration** with the test script
5. **Check database** for user verification status

### Useful Commands

```bash
# Quick health check
node scripts/test-email-verification.js

# Check specific user
node scripts/check-user.js

# Test email sending
node scripts/test-email.js

# List all users
node scripts/list-users.js
```

---

**Note**: This email verification system is production-ready and includes comprehensive security features, rate limiting, and error handling. Make sure to configure your email provider correctly and test thoroughly before deploying to production. 
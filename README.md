# Credit Score Dashboard

A comprehensive credit scoring and lending decision platform with AI-powered analytics.

## 🚨 Security Notice

This application handles sensitive financial data. Please ensure you:

1. **Never commit `.env` files** - They contain sensitive credentials
2. **Use strong, unique passwords** for all services
3. **Enable HTTPS in production** 
4. **Regularly update dependencies** to patch security vulnerabilities
5. **Monitor logs** for suspicious activity

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB
- Redis (for rate limiting)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd credit-score-dashboard
   ```

2. **Install dependencies**
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

3. **Set up environment variables**
   ```bash
   # Backend
   cp backend/env.example backend/.env
   # Edit backend/.env with your actual values
   
   # Frontend  
   cp frontend/env.example frontend/.env
   # Edit frontend/.env with your actual values
   ```

4. **Required Environment Variables**

   **Backend (.env):**
   ```bash
   MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database
   JWT_SECRET=your-super-secret-jwt-key-here-make-it-long-and-random
   JWT_REFRESH_SECRET=your-super-secret-refresh-jwt-key-here-make-it-long-and-random
   SESSION_SECRET=your-super-secret-session-key-here-make-it-long-and-random
   PHONE_SALT=your-super-secret-phone-salt-here-make-it-long-and-random
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   FRONTEND_URL=http://localhost:5177
   CORS_ORIGINS=http://localhost:5177,http://localhost:3000
   ```

   **Frontend (.env):**
   ```bash
   VITE_FIREBASE_API_KEY=your-firebase-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_API_BASE_URL=http://localhost:3000/api/v1
   ```

5. **Start the application**
   ```bash
   # Development (both frontend and backend)
   npm run dev
   
   # Or start separately
   npm run start --workspace=backend
   npm run dev --workspace=frontend
   ```

## Security Features

- ✅ **JWT Authentication** with refresh tokens
- ✅ **Rate Limiting** to prevent abuse
- ✅ **CORS Protection** with specific origins
- ✅ **Input Validation** and sanitization
- ✅ **Path Traversal Protection** for file operations
- ✅ **XSS Prevention** with proper content handling
- ✅ **Environment-based Debug Routes** (development only)
- ✅ **Secure Password Hashing** with bcrypt
- ✅ **Helmet Security Headers**
- ✅ **MongoDB Query Sanitization**

## Production Deployment

1. **Set NODE_ENV=production**
2. **Configure HTTPS** with SSL certificates
3. **Set up proper CORS origins**
4. **Use strong, unique secrets**
5. **Enable monitoring and logging**
6. **Regular security audits**

## API Documentation

See `API_DOCUMENTATION_ENHANCED.md` for detailed API endpoints.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

[Your License Here]

## Batch Uploads (Production)

- **All batch uploads must use the Schema Mapping Engine.**
- Endpoint: `/api/schema-mapping/apply/:mappingId`
- **A mapping and partner selection are required for every upload.**
- Supported file formats: **JSON, CSV, Excel (.xlsx/.xls), XML, TXT**
- The old `/api/upload/batch` endpoint is **deprecated and removed**.

### Migration Note
If you previously used direct upload, you must now create a schema mapping for your data format and select it during upload. See `SCHEMA_MAPPING_ENGINE.md` for details. 
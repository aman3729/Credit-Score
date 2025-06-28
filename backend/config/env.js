// Environment Configuration
const env = process.env.NODE_ENV || 'development';

// Common configuration
const common = {
  NODE_ENV: env,
  PORT: process.env.PORT || 3000,
  API_PREFIX: '/api/v1',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRES_IN: '30d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'your_cookie_secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
};

// Environment specific configuration
const envConfig = {
  development: {
    MONGODB_URI: 'mongodb+srv://aman:49b1HtpesbsJfZnz@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority&appName=credit-score-dashboard',
  },
  test: {
    MONGODB_URI: 'mongodb+srv://aman:49b1HtpesbsJfZnz@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority&appName=credit-score-dashboard',
  },
  production: {
    MONGODB_URI: 'mongodb+srv://aman:49b1HtpesbsJfZnz@credit-score-dashboard.w2bwj1o.mongodb.net/credit-score-dashboard?retryWrites=true&w=majority&appName=credit-score-dashboard',
  }
};

// Merge common and environment specific config
const config = {
  ...common,
  ...(envConfig[env] || envConfig.development)
};

// Export the config
export default config;

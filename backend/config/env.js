// Environment Configuration
const env = process.env.NODE_ENV || 'development';

// Common configuration
const common = {
  NODE_ENV: env,
  PORT: process.env.PORT || 3000,
  HOST: process.env.HOST || '0.0.0.0',
  API_PREFIX: '/api/v1',
  JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret_key',
  JWT_EXPIRES_IN: '30d',
  COOKIE_SECRET: process.env.COOKIE_SECRET || 'your_cookie_secret',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:3000',
  MONGODB_URI: process.env.MONGODB_URI,
};

// Environment specific configuration
const envConfig = {
  development: {
    // Development specific settings
    LOG_LEVEL: 'debug',
  },
  test: {
    // Test specific settings
    LOG_LEVEL: 'error',
  },
  production: {
    // Production specific settings
    LOG_LEVEL: 'info',
  }
};

// Merge common and environment specific config
const config = {
  ...common,
  ...(envConfig[env] || envConfig.development)
};

// Validate required environment variables
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  if (env === 'production') {
    process.exit(1);
  }
}

// Export the config
export default config; 
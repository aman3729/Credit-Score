import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import jwt from 'jsonwebtoken';

// --- Environment Variable Checks ---
// Ensure critical secrets are defined, especially in production.
if (!process.env.SESSION_SECRET) {
  console.error("FATAL ERROR: SESSION_SECRET is not defined in the environment variables.");
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

if (!process.env.JWT_SECRET) {
  console.error("FATAL ERROR: JWT_SECRET is not defined in the environment variables.");
  if (process.env.NODE_ENV === 'production') {
    process.exit(1);
  }
}

// --- Session Configuration ---
export const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default-dev-secret', // Fallback for dev only,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
};

// --- 2FA Functions ---
/**
 * Generates a 2FA secret and a corresponding QR code for a user.
 * @param {string} email - The user's email, used to label the 2FA entry.
 * @returns {Promise<{secret: string, qrCode: string}>}
 */
export const generateTwoFactorSecret = async (email) => {
  const secret = speakeasy.generateSecret({
    name: `Credit Score Dashboard (${email})`,
  });

  const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);

  return {
    secret: secret.base32,
    qrCode: qrCodeUrl,
  };
};

/**
 * Verifies a 2FA token against a user's secret.
 * @param {string} secret - The user's base32 encoded 2FA secret.
 * @param {string} token - The 6-digit token from the user's authenticator app.
 * @returns {boolean} - True if the token is valid, false otherwise.
 */
export const verifyTwoFactorToken = (secret, token) => {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1, // Allow for a 30-second clock drift
  });
};

// --- JWT Generation ---
/**
 * Generates a JWT for a given user.
 * @param {object} user - The user object, must contain an _id property.
 * @returns {string} - The generated JWT.
 */
export const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id },
    process.env.JWT_SECRET || 'default-dev-secret', // Fallback for dev only,
    { expiresIn: '24h' }
  );
};
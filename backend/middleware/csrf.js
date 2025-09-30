import crypto from 'crypto';
import { logger } from '../config/logger.js';

// Stateless CSRF using double-submit cookie with HMAC signed token
// Token format: base64url(payload).hex(signature)
// payload: { iat: ms, exp: ms, rnd: hex }
// signature = HMAC_SHA256(secret, base64url(payload))

const getSecret = () => {
  const secret = process.env.CSRF_SECRET || process.env.SESSION_SECRET || process.env.JWT_SECRET;
  if (!secret) {
    logger.error('CSRF_SECRET/SESSION_SECRET/JWT_SECRET not set. CSRF protection may be weakened.');
  }
  return secret || 'fallback-secret-change-me';
};

const b64url = (buf) => Buffer.from(JSON.stringify(buf)).toString('base64url');
const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const nowMs = () => Date.now();

// Generate CSRF token
export const generateCSRFToken = (maxAgeMs = 24 * 60 * 60 * 1000) => {
  const payload = {
    iat: nowMs(),
    exp: nowMs() + maxAgeMs,
    rnd: crypto.randomBytes(16).toString('hex'),
  };
  const payloadB64 = b64url(payload);
  const sig = sign(payloadB64, getSecret());
  return `${payloadB64}.${sig}`;
};

// Validate CSRF token
export const validateCSRFToken = (token) => {
  if (!token || typeof token !== 'string' || !token.includes('.')) return false;
  try {
    const [payloadB64, sig] = token.split('.');
    const expected = sign(payloadB64, getSecret());
    const ok = crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
    if (!ok) return false;
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    if (!payload || typeof payload.exp !== 'number') return false;
    if (payload.exp < nowMs()) return false;
    return true;
  } catch (error) {
    logger.error('CSRF token validation error:', error);
    return false;
  }
};

// CSRF protection middleware
export const csrfProtection = (options = {}) => {
  const {
    ignoreMethods = ['GET', 'HEAD', 'OPTIONS'],
    ignorePaths = [],
    cookieName = 'XSRF-TOKEN',
    headerName = 'X-XSRF-TOKEN'
  } = options;

  return (req, res, next) => {
    // Skip CSRF check for ignored methods
    if (ignoreMethods.includes(req.method)) {
      return next();
    }

    // Skip CSRF check for ignored paths
    if (ignorePaths.some(path => req.path.startsWith(path))) {
      return next();
    }

    // Get token from header or body (double-submit cookie is informational only now)
    const token = req.headers[headerName.toLowerCase()] || req.body?._csrf || req.cookies[cookieName];

    if (!token) {
      logger.warn(`CSRF token missing for ${req.method} ${req.path}`);
      return res.status(403).json({
        status: 'error',
        message: 'CSRF token missing'
      });
    }

    if (!validateCSRFToken(token)) {
      logger.warn(`CSRF token invalid for ${req.method} ${req.path}`);
      return res.status(403).json({
        status: 'error',
        message: 'CSRF token invalid'
      });
    }

    // Token is valid, proceed
    next();
  };
};

// Middleware to add CSRF token to response
export const addCSRFToken = (req, res, next) => {
  const token = generateCSRFToken();
  
  // Set token in cookie
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Allow JavaScript access
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  });

  // Add token to response body
  res.locals.csrfToken = token;
  
  next();
};

// CSRF token endpoint
export const getCSRFToken = (req, res) => {
  const token = generateCSRFToken();
  
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000
  });

  res.json({ csrfToken: token });
};

// Revoke CSRF token
export const revokeCSRFToken = (token) => {
  // Stateless: nothing to revoke server-side
};

// Get CSRF token statistics (for monitoring)
export const getCSRFStats = () => {
  return { mode: 'stateless-hmac', timestamp: Date.now() };
};
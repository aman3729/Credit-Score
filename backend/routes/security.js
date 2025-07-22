import express from 'express';
import crypto from 'crypto';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import { generateTwoFactorSecret, verifyTwoFactorToken } from '../config/auth.js';
import { sendEmail, emailTemplates } from '../config/email.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Cache security settings for 5 minutes
const SECURITY_SETTINGS_CACHE_DURATION = 300; // 5 minutes in seconds
let cachedSettings = null;
let cacheTimestamp = 0;

// Get security settings
router.get('/settings', auth, requireAdmin, async (req, res) => {
  try {
    const now = Math.floor(Date.now() / 1000); // Current time in seconds
    
    // Return cached settings if they exist and are not expired
    if (cachedSettings && (now - cacheTimestamp) < SECURITY_SETTINGS_CACHE_DURATION) {
      res.set({
        'Cache-Control': 'public, max-age=300', // 5 minutes
        'Last-Modified': new Date(cacheTimestamp * 1000).toUTCString()
      });
      return res.json(cachedSettings);
    }

    // Default security settings - this would typically come from a database
    const settings = {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        maxAgeDays: 90
      },
      twoFactor: {
        required: false,
        methods: ['app', 'sms', 'email']
      },
      session: {
        timeoutMinutes: 30,
        maxSessions: 5
      },
      loginSecurity: {
        maxFailedAttempts: 5,
        lockoutTimeMinutes: 15,
        ipWhitelist: [],
        mfaRequired: false
      },
      auditLogs: {
        enabled: true,
        retentionDays: 90
      },
      lastUpdated: now
    };

    // Update cache
    cachedSettings = settings;
    cacheTimestamp = now;

    // Set cache control headers
    res.set({
      'Cache-Control': 'public, max-age=300', // 5 minutes
      'Last-Modified': new Date(now * 1000).toUTCString()
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    res.status(500).json({ status: 'error', message: 'Failed to fetch security settings' });
  }
});

// Enable 2FA
router.post('/2fa/enable', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is already enabled' });
    }

    const { secret, qrCode } = await generateTwoFactorSecret(user.email);
    
    user.twoFactorSecret = secret;
    await user.save();

    res.json({
      message: '2FA setup initiated',
      qrCode,
      secret
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to enable 2FA' });
  }
});

// Verify and activate 2FA
router.post('/2fa/verify', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user || !user.twoFactorSecret) {
      return res.status(400).json({ error: '2FA not set up' });
    }

    const isValid = verifyTwoFactorToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    user.twoFactorEnabled = true;
    await user.save();

    res.json({ message: '2FA enabled successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to verify 2FA' });
  }
});

// Disable 2FA
router.post('/2fa/disable', auth, async (req, res) => {
  try {
    const { token } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user || !user.twoFactorEnabled) {
      return res.status(400).json({ error: '2FA is not enabled' });
    }

    const isValid = verifyTwoFactorToken(user.twoFactorSecret, token);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid 2FA token' });
    }

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    await user.save();

    res.json({ message: '2FA disabled successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to disable 2FA' });
  }
});

// Request password reset
router.post('/password/reset-request', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Send password reset email
    await sendEmail({
      to: user.email,
      ...emailTemplates.passwordReset(resetToken)
    });

    res.json({ message: 'Password reset email sent' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to process password reset request' });
  }
});

// Reset password
router.post('/password/reset', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to reset password' });
  }
});

// Update notification preferences
router.put('/notifications/preferences', auth, async (req, res) => {
  try {
    const { email, push } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (email) {
      user.notificationPreferences.email = {
        ...user.notificationPreferences.email,
        ...email
      };
    }

    if (push) {
      user.notificationPreferences.push = {
        ...user.notificationPreferences.push,
        ...push
      };
    }

    await user.save();
    res.json({
      message: 'Notification preferences updated',
      preferences: user.notificationPreferences
    });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to update notification preferences' });
  }
});

// Register device
router.post('/devices/register', auth, async (req, res) => {
  try {
    const { deviceId, deviceName } = req.body;
    const user = await User.findById(req.user.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const existingDevice = user.devices.find(d => d.deviceId === deviceId);
    if (existingDevice) {
      existingDevice.lastUsed = new Date();
      existingDevice.deviceName = deviceName;
    } else {
      user.devices.push({
        deviceId,
        deviceName,
        lastUsed: new Date(),
        trusted: false
      });
    }

    await user.save();
    res.json({ message: 'Device registered successfully' });
  } catch (error) {
    res.status(500).json({ status: 'error', message: 'Failed to register device' });
  }
});

export default router; 
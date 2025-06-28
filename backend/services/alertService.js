import { logger } from '../config/logger.js';
import { sendEmail } from '../config/email.js';
import { getIO } from '../config/socket.js';

class AlertService {
  constructor() {
    this.alertThresholds = {
      failedLogins: 5, // Number of failed logins within timeWindow
      timeWindow: 5 * 60 * 1000, // 5 minutes
      suspiciousIPs: new Set(),
      rateLimitExceeded: 10 // Number of rate limit hits before alerting
    };

    this.alertHistory = new Map(); // Track alert history to prevent spam
    this.failedAttempts = new Map(); // Track failed login attempts
    this.rateLimitHits = new Map(); // Track rate limit hits
    this.acknowledgedAlerts = new Map(); // Track acknowledged alerts
  }

  async trackFailedLogin(ip, username) {
    const key = `${ip}:${username}`;
    const now = Date.now();
    
    if (!this.failedAttempts.has(key)) {
      this.failedAttempts.set(key, []);
    }

    const attempts = this.failedAttempts.get(key);
    attempts.push(now);

    // Remove attempts outside the time window
    const windowStart = now - this.alertThresholds.timeWindow;
    const recentAttempts = attempts.filter(time => time > windowStart);
    this.failedAttempts.set(key, recentAttempts);

    if (recentAttempts.length >= this.alertThresholds.failedLogins) {
      await this.createAlert('failed_login', {
        ip,
        username,
        attempts: recentAttempts.length,
        severity: 'high'
      });
      this.alertThresholds.suspiciousIPs.add(ip);
    }
  }

  async trackRateLimit(ip, endpoint) {
    const key = `${ip}:${endpoint}`;
    const hits = (this.rateLimitHits.get(key) || 0) + 1;
    this.rateLimitHits.set(key, hits);

    if (hits >= this.alertThresholds.rateLimitExceeded) {
      await this.createAlert('rate_limit_exceeded', {
        ip,
        endpoint,
        hits,
        severity: 'medium'
      });
      this.alertThresholds.suspiciousIPs.add(ip);
    }
  }

  async createAlert(type, data) {
    const { ip, severity = 'low', ...alertData } = data;
    const now = Date.now();
    const alertKey = `${type}:${ip}`;
    const alertId = `${alertKey}:${now}`;

    // Check if we've recently sent a similar alert
    const lastAlert = this.alertHistory.get(alertKey);
    if (lastAlert && (now - lastAlert) < 30 * 60 * 1000) { // 30 minutes cooldown
      return; // Skip duplicate alert
    }

    // Log the alert
    logger.warn(`Security Alert: ${type}`, {
      ...alertData,
      ip,
      severity,
      timestamp: new Date().toISOString(),
      alertId
    });

    // Send email to admin
    try {
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: `Security Alert: ${type}`,
        html: `
          <h1>Security Alert</h1>
          <p><strong>Type:</strong> ${type}</p>
          <p><strong>Severity:</strong> ${severity}</p>
          <p><strong>IP:</strong> ${ip}</p>
          <p><strong>Details:</strong></p>
          <pre>${JSON.stringify(alertData, null, 2)}</pre>
          <p><strong>Alert ID:</strong> ${alertId}</p>
        `
      });
    } catch (error) {
      logger.error('Failed to send alert email:', error);
    }

    // Send real-time notification via WebSocket
    const io = getIO();
    io.to('admins').emit('securityAlert', {
      type,
      ip,
      severity,
      ...alertData,
      timestamp: new Date().toISOString(),
      alertId,
      acknowledged: false
    });

    // Update alert history
    this.alertHistory.set(alertKey, now);
  }

  async acknowledgeAlert(alertId, adminId) {
    if (!this.acknowledgedAlerts.has(alertId)) {
      const acknowledgment = {
        adminId,
        timestamp: new Date().toISOString()
      };
      
      this.acknowledgedAlerts.set(alertId, acknowledgment);

      // Log the acknowledgment
      logger.info('Alert acknowledged', {
        alertId,
        adminId,
        timestamp: acknowledgment.timestamp
      });

      // Notify all admin clients
      const io = getIO();
      io.to('admins').emit('alertAcknowledged', {
        alertId,
        adminId,
        timestamp: acknowledgment.timestamp
      });

      return acknowledgment;
    }
    return null;
  }

  isAlertAcknowledged(alertId) {
    return this.acknowledgedAlerts.has(alertId);
  }

  getAlertAcknowledgment(alertId) {
    return this.acknowledgedAlerts.get(alertId);
  }

  isSuspiciousIP(ip) {
    return this.alertThresholds.suspiciousIPs.has(ip);
  }

  // Clean up old data periodically
  cleanup() {
    const now = Date.now();
    
    // Clean up old failed attempts
    for (const [key, attempts] of this.failedAttempts.entries()) {
      const windowStart = now - this.alertThresholds.timeWindow;
      const recentAttempts = attempts.filter(time => time > windowStart);
      if (recentAttempts.length === 0) {
        this.failedAttempts.delete(key);
      } else {
        this.failedAttempts.set(key, recentAttempts);
      }
    }

    // Clean up old rate limit hits
    this.rateLimitHits.clear();

    // Clean up old alert history (older than 24 hours)
    const alertExpiry = now - 24 * 60 * 60 * 1000;
    for (const [key, timestamp] of this.alertHistory.entries()) {
      if (timestamp < alertExpiry) {
        this.alertHistory.delete(key);
      }
    }

    // Clean up old acknowledgments (older than 30 days)
    const ackExpiry = now - 30 * 24 * 60 * 60 * 1000;
    for (const [alertId, ack] of this.acknowledgedAlerts.entries()) {
      if (new Date(ack.timestamp).getTime() < ackExpiry) {
        this.acknowledgedAlerts.delete(alertId);
      }
    }
  }
}

export const alertService = new AlertService();

// Run cleanup every hour
setInterval(() => {
  alertService.cleanup();
}, 60 * 60 * 1000); 
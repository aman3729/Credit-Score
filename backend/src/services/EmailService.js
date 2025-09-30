import { BaseService } from './BaseService.js';
import nodemailer from 'nodemailer';
import { logger } from '../../config/logger.js';
import AppError from '../../utils/appError.js';

/**
 * Email service for handling email communications
 */
export class EmailService extends BaseService {
  constructor() {
    super(null); // No specific model for emails
    this.transporter = null;
    this.initializeTransporter();
  }

  /**
   * Initialize email transporter
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: process.env.EMAIL_SECURE === 'true',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      logger.info('Email transporter initialized');
    } catch (error) {
      logger.error('Failed to initialize email transporter', { error: error.message });
    }
  }

  /**
   * Send email
   * @param {Object} options - Email options
   * @returns {Promise<Object>} Send result
   */
  async sendEmail(options) {
    try {
      const {
        to,
        subject,
        text,
        html,
        from = process.env.EMAIL_FROM,
        attachments = []
      } = options;

      if (!this.transporter) {
        throw new AppError('Email transporter not initialized', 500);
      }

      const mailOptions = {
        from,
        to,
        subject,
        text,
        html,
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to,
        subject,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Failed to send email', {
        to: options.to,
        subject: options.subject,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send welcome email
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail(email, name) {
    const subject = 'Welcome to Credit Score Dashboard';
    const text = `Hello ${name},\n\nWelcome to the Credit Score Dashboard! Your account has been created successfully.\n\nBest regards,\nThe Credit Score Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Credit Score Dashboard</h2>
        <p>Hello ${name},</p>
        <p>Welcome to the Credit Score Dashboard! Your account has been created successfully.</p>
        <p>You can now log in and start managing your credit score.</p>
        <p>Best regards,<br>The Credit Score Team</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send password reset email
   * @param {string} email - Recipient email
   * @param {string} resetToken - Reset token
   * @returns {Promise<Object>} Send result
   */
  async sendPasswordResetEmail(email, resetToken) {
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset Request';
    const text = `You requested a password reset. Click the following link to reset your password: ${resetUrl}\n\nIf you didn't request this, please ignore this email.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>You requested a password reset for your Credit Score Dashboard account.</p>
        <p><a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>This link will expire in 10 minutes.</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send email verification email
   * @param {string} email - Recipient email
   * @param {string} verificationToken - Verification token
   * @returns {Promise<Object>} Send result
   */
  async sendEmailVerificationEmail(email, verificationToken) {
    const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = 'Verify Your Email Address';
    const text = `Please verify your email address by clicking the following link: ${verificationUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Please verify your email address for your Credit Score Dashboard account.</p>
        <p><a href="${verificationUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a></p>
        <p>If you didn't create an account, please ignore this email.</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send credit score update notification
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {number} oldScore - Previous credit score
   * @param {number} newScore - New credit score
   * @returns {Promise<Object>} Send result
   */
  async sendCreditScoreUpdateEmail(email, name, oldScore, newScore) {
    const change = newScore - oldScore;
    const changeText = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'remained the same';
    const changeColor = change > 0 ? '#28a745' : change < 0 ? '#dc3545' : '#6c757d';

    const subject = 'Your Credit Score Has Been Updated';
    const text = `Hello ${name},\n\nYour credit score has ${changeText} from ${oldScore} to ${newScore}.\n\nLog in to your dashboard to view the details.\n\nBest regards,\nThe Credit Score Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Credit Score Update</h2>
        <p>Hello ${name},</p>
        <p>Your credit score has been updated:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Previous Score:</strong> ${oldScore}</p>
          <p><strong>New Score:</strong> ${newScore}</p>
          <p style="color: ${changeColor};"><strong>Change:</strong> ${change > 0 ? '+' : ''}${change}</p>
        </div>
        <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Dashboard</a></p>
        <p>Best regards,<br>The Credit Score Team</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send suspicious activity alert
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {Object} activity - Activity details
   * @returns {Promise<Object>} Send result
   */
  async sendSuspiciousActivityEmail(email, name, activity) {
    const subject = 'Suspicious Activity Detected';
    const text = `Hello ${name},\n\nWe detected suspicious activity on your account:\n\nActivity: ${activity.type}\nTime: ${activity.timestamp}\nLocation: ${activity.location}\n\nIf this wasn't you, please contact support immediately.\n\nBest regards,\nThe Credit Score Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc3545;">Suspicious Activity Alert</h2>
        <p>Hello ${name},</p>
        <p>We detected suspicious activity on your account:</p>
        <div style="background-color: #f8d7da; border: 1px solid #f5c6cb; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Activity:</strong> ${activity.type}</p>
          <p><strong>Time:</strong> ${activity.timestamp}</p>
          <p><strong>Location:</strong> ${activity.location}</p>
        </div>
        <p>If this wasn't you, please contact support immediately.</p>
        <p><a href="${process.env.FRONTEND_URL}/support" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Contact Support</a></p>
        <p>Best regards,<br>The Credit Score Team</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Send batch upload completion notification
   * @param {string} email - Recipient email
   * @param {string} name - Recipient name
   * @param {Object} results - Upload results
   * @returns {Promise<Object>} Send result
   */
  async sendBatchUploadCompletionEmail(email, name, results) {
    const subject = 'Batch Upload Completed';
    const text = `Hello ${name},\n\nYour batch upload has been completed:\n\nTotal Records: ${results.totalRecords}\nSuccessful: ${results.successful}\nFailed: ${results.failed}\n\nLog in to your dashboard to view the results.\n\nBest regards,\nThe Credit Score Team`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Batch Upload Completed</h2>
        <p>Hello ${name},</p>
        <p>Your batch upload has been completed:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Total Records:</strong> ${results.totalRecords}</p>
          <p style="color: #28a745;"><strong>Successful:</strong> ${results.successful}</p>
          <p style="color: #dc3545;"><strong>Failed:</strong> ${results.failed}</p>
        </div>
        <p><a href="${process.env.FRONTEND_URL}/dashboard" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Results</a></p>
        <p>Best regards,<br>The Credit Score Team</p>
      </div>
    `;

    return this.sendEmail({ to: email, subject, text, html });
  }

  /**
   * Verify email configuration
   * @returns {Promise<boolean>} Configuration status
   */
  async verifyConfiguration() {
    try {
      if (!this.transporter) {
        return false;
      }

      await this.transporter.verify();
      logger.info('Email configuration verified');
      return true;
    } catch (error) {
      logger.error('Email configuration verification failed', { error: error.message });
      return false;
    }
  }

  /**
   * Get email statistics
   * @returns {Promise<Object>} Email statistics
   */
  async getEmailStats() {
    // This would typically connect to an email service API
    // For now, return basic stats
    return {
      totalSent: 0,
      totalFailed: 0,
      successRate: 0,
      lastSent: null
    };
  }
} 
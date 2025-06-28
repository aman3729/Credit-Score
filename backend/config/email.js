import nodemailer from 'nodemailer';
import { logger } from './logger.js';

// Determine email transport mode. Use JSON for development if no SMTP host is set.
const isJsonTransport = process.env.NODE_ENV !== 'production' && !process.env.SMTP_HOST;

const transportConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: (process.env.SMTP_PORT === '465'), // `true` for port 465, `false` for all other ports
  auth: (process.env.SMTP_USER && process.env.SMTP_PASS) ? {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  } : undefined,
  jsonTransport: isJsonTransport,
};

const transporter = nodemailer.createTransport(transportConfig);

// Verify SMTP connection on startup (non-blocking)
const verifySMTP = () => {
  // Skip verification in test environment or if explicitly disabled
  if (process.env.NODE_ENV === 'test' || process.env.SKIP_SMTP_VERIFY === 'true') {
    logger.warn('SMTP verification skipped. Emails may not be sent if SMTP is not properly configured.');
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    transporter.verify((error) => {
      if (error) {
        logger.warn('SMTP transport verification failed. Emails may not be sent.', { 
          error: error.message,
          hint: 'Check your SMTP configuration in .env file',
          config: { 
            host: transportConfig.host,
            port: transportConfig.port,
            secure: transportConfig.secure,
            auth: transportConfig.auth ? 'Credentials Provided' : 'No Credentials' 
          } 
        });
      } else {
        logger.info('SMTP transport is configured and ready to send emails.');
      }
      resolve(); // Always resolve to prevent blocking server startup
    });
  });
};

// Run verification in the background
verifySMTP().catch(err => {
  logger.error('Error during SMTP verification:', err);
});

/**
 * Sends an email using the pre-configured transporter.
 * @param {{to: string, subject: string, text?: string, html: string}}
 * @returns {Promise<any>} The result from nodemailer's sendMail.
 */
export const sendEmail = async ({ to, subject, text, html }) => {
  const fromAddress = process.env.SMTP_FROM || '"Credit Score Dashboard" <noreply@example.com>';
  try {
    logger.info(`Sending email to: ${to}, subject: '${subject}'`);
    const info = await transporter.sendMail({ from: fromAddress, to, subject, text, html });
    logger.info(`Email sent successfully to ${to}, messageId: ${info.messageId}`);
    return info;
  } catch (error) {
    logger.error(`Failed to send email to ${to}`, { error: error.message, subject });
    throw new Error('Failed to send email.'); // Re-throw a generic error
  }
};

/**
 * A collection of pre-defined email templates.
 */
export const emailTemplates = {
  welcomeEmail: (username) => ({
    subject: 'Welcome to Credit Score Dashboard',
    html: `<h1>Welcome ${username}!</h1><p>Thank you for joining. We're excited to help you monitor and improve your credit score.</p>`,
  }),

  passwordReset: (resetToken) => ({
    subject: 'Password Reset Request',
    html: `<h1>Password Reset</h1><p>Click the link to reset your password: <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Reset Password</a></p>`,
  }),

  scoreUpdate: (username, newScore) => ({
    subject: 'Your Credit Score Has Been Updated',
    html: `<h1>Score Update</h1><p>Hello ${username}, your new credit score is: ${newScore}.</p>`,
  }),

  paymentSuccess: (username, plan, amount) => ({
    subject: 'Payment Successful',
    html: `<h1>Payment Processed</h1><p>Hello ${username}, your payment of ${amount} for the ${plan} plan was successful.</p>`,
  }),

  paymentFailed: (username, plan) => ({
    subject: 'Payment Failed',
    html: `<h1>Payment Failed</h1><p>Hello ${username}, we were unable to process the payment for your ${plan} plan.</p>`,
  }),

  subscriptionRenewal: (username, plan, amount, dueDate) => ({
    subject: 'Subscription Renewal Reminder',
    html: `<h1>Subscription Reminder</h1><p>Hello ${username}, your ${plan} plan will renew for ${amount} on ${new Date(dueDate).toLocaleDateString()}.</p>`,
  }),

  subscriptionExpired: (username, plan) => ({
    subject: 'Your Subscription Has Expired',
    html: `<h1>Subscription Expired</h1><p>Hello ${username}, your ${plan} plan has expired. Please renew to continue service.</p>`,
  }),

  emailVerification: (username, token) => ({
    subject: 'Verify Your Email Address',
    html: `<h1>Verify Your Email</h1><p>Click to verify: <a href="${process.env.FRONTEND_URL}/verify-email?token=${token}">Verify Email</a></p>`,
  }),
}; 
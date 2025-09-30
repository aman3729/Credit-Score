import nodemailer from 'nodemailer';
import { logger } from './logger.js';
import axios from 'axios';

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

  emailVerification: (username, tokenOrLink) => {
    // If tokenOrLink looks like a URL, use it directly; otherwise, build the URL
    const verification_link = tokenOrLink.startsWith('http')
      ? tokenOrLink
      : `${process.env.FRONTEND_URL || 'http://localhost:5177'}/verify-email/${tokenOrLink}`;
    return {
      subject: 'Verify Your Email Address',
      html: `<!DOCTYPE html>
<html>
  <body style="font-family: Arial, sans-serif; background: #f9f9f9; padding: 30px;">
    <div style="max-width: 500px; margin: auto; background: #fff; border-radius: 8px; box-shadow: 0 2px 8px #eee; padding: 30px;">
      <h2 style="color: #2d6cdf;">Welcome to AMAN!</h2>
      <p>Hi${username ? `, ${username}` : ''},</p>
      <p>Thank you for registering. To complete your registration, please verify your email address by clicking the button below:</p>
      <p style="text-align: center;">
        <a href="${verification_link}" style="background: #2d6cdf; color: #fff; padding: 12px 24px; border-radius: 5px; text-decoration: none; font-weight: bold;">Verify Email</a>
      </p>
      <p>If the button above does not work, copy and paste the following link into your browser:</p>
      <p style="word-break: break-all;"><a href="${verification_link}">${verification_link}</a></p>
      <hr>
      <p style="font-size: 12px; color: #888;">If you did not create an account, you can safely ignore this email.</p>
      <p style="font-size: 12px; color: #888;">&copy; 2025 AMAN SCORE</p>
    </div>
  </body>
</html>`
    };
  },
}; 

export const publicKey = 'X9yM769rq-ocAWraV';
export const privateKey = 'LVfY96Y_bqpAvnwWYWoHX';
export const serviceId = 'service_wu9foxz';
export const templateId = 'template_rg1vfhm'; 

export const sendCreditScoreUpdateEmail = async ({ name, email, score, previousScore, change }) => {
  return sendEmail({
    to: email,
    ...emailTemplates.scoreUpdate(name, score),
    html: `<h1>Credit Score Update</h1>
      <p>Hello ${name},</p>
      <p>Your credit score has been updated.</p>
      <p><strong>Previous Score:</strong> ${previousScore}</p>
      <p><strong>New Score:</strong> ${score}</p>
      <p><strong>Change:</strong> ${change > 0 ? '+' : ''}${change}</p>
      <p>Visit your dashboard for more details.</p>`
  });
}; 

export const sendVerificationEmail = async (to, verificationLink) => {
  const templateParams = {
    to_email: to,
    verification_link: verificationLink,
  };

  await axios.post('https://api.emailjs.com/api/v1.0/email/send', {
    service_id: process.env.EMAILJS_SERVICE_ID,
    template_id: process.env.EMAILJS_TEMPLATE_ID,
    user_id: process.env.EMAILJS_PUBLIC_KEY,
    accessToken: process.env.EMAILJS_PRIVATE_KEY,
    template_params: templateParams,
  });
}; 
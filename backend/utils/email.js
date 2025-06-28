import nodemailer from 'nodemailer';
import pug from 'pug';
import { convert } from 'html-to-text';
import { logger } from '../config/logger.js';

// Create a test account for development
const createTestAccount = async () => {
  const testAccount = await nodemailer.createTestAccount();
  return {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  };
};

// Create a transport for sending emails
const createTransport = async () => {
  if (process.env.NODE_ENV === 'production') {
    // Use SendGrid in production
    return nodemailer.createTransport({
      service: 'SendGrid',
      auth: {
        user: process.env.SENDGRID_USERNAME,
        pass: process.env.SENDGRID_PASSWORD,
      },
    });
  }

  // Use Mailtrap in development
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Email templates
const emailTemplates = {
  welcome: {
    subject: 'Welcome to Credit Score Dashboard!',
    template: 'welcome',
  },
  passwordReset: {
    subject: 'Your password reset token (valid for 10 minutes)',
    template: 'passwordReset',
  },
  emailVerification: {
    subject: 'Verify your email address',
    template: 'emailVerification',
  },
  creditScoreUpdate: {
    subject: 'Your credit score has been updated',
    template: 'creditScoreUpdate',
  },
  suspiciousActivity: {
    subject: 'Suspicious activity detected on your account',
    template: 'suspiciousActivity',
  },
};

// Compile email template
const compileTemplate = (template, data = {}) => {
  const templatePath = `${__dirname}/../views/emails/${template}.pug`;
  return pug.renderFile(templatePath, data);
};

// Send email
const sendEmail = async (to, templateName, data = {}) => {
  try {
    const template = emailTemplates[templateName];
    if (!template) {
      throw new Error(`Template ${templateName} not found`);
    }

    // Create transport
    const transport = await createTransport();

    // Compile template
    const html = compileTemplate(template.template, data);
    const text = convert(html);

    // Define email options
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_EMAIL}>`,
      to,
      subject: template.subject,
      html,
      text,
    };

    // Send email
    const info = await transport.sendMail(mailOptions);

    // Log email info in development
    if (process.env.NODE_ENV !== 'production') {
      logger.info(`Email sent: ${info.messageId}`);
      logger.info(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
    }

    return info;
  } catch (error) {
    logger.error('Error sending email:', error);
    throw new Error('There was an error sending the email. Please try again later.');
  }
};

// Send welcome email
const sendWelcomeEmail = async (user) => {
  await sendEmail(user.email, 'welcome', {
    name: user.name,
    url: `${process.env.FRONTEND_URL}/dashboard`,
  });
};

// Send password reset email
const sendPasswordResetEmail = async (user, resetToken) => {
  const resetURL = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`;
  
  await sendEmail(user.email, 'passwordReset', {
    name: user.name,
    url: resetURL,
    expiresIn: '10 minutes',
  });
};

// Send email verification email
const sendEmailVerificationEmail = async (user, verificationToken) => {
  const verificationURL = `${process.env.API_URL}/api/v1/auth/verify-email/${verificationToken}`;
  
  await sendEmail(user.email, 'emailVerification', {
    name: user.name,
    url: verificationURL,
  });
};

// Send credit score update email
const sendCreditScoreUpdateEmail = async (user, score, previousScore) => {
  await sendEmail(user.email, 'creditScoreUpdate', {
    name: user.name,
    score,
    previousScore,
    change: score - previousScore,
    url: `${process.env.FRONTEND_URL}/dashboard/credit-score`,
  });
};

// Send suspicious activity alert email
const sendSuspiciousActivityEmail = async (user, activity) => {
  await sendEmail(user.email, 'suspiciousActivity', {
    name: user.name,
    activity,
    timestamp: new Date().toLocaleString(),
    url: `${process.env.FRONTEND_URL}/security`,
  });
};

export {
  sendEmail,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendEmailVerificationEmail,
  sendCreditScoreUpdateEmail,
  sendSuspiciousActivityEmail,
  createTransport, // Export for testing
  emailTemplates, // Export for testing
};

import cron from 'node-cron';
import User from '../models/User.js';
import { sendEmail, emailTemplates } from './email.js';
import { logArchiver } from '../services/logArchiver.js';
import { logger } from './logger.js';

const CRON_TIMEZONE = 'UTC';

/**
 * Initializes all scheduled cron jobs for the application.
 */
export const initCronJobs = () => {
  logger.info('Initializing cron jobs...');

  // --- Subscription Management Cron ---
  // Runs daily at midnight UTC.
  cron.schedule('0 0 * * *', async () => {
    logger.info('Running subscription management cron job...');
    try {
      // --- Handle Renewal Reminders ---
      const threeDaysFromNow = new Date();
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

      const usersToRemind = await User.find({
        'planDetails.nextBillingDate': { $gte: new Date(), $lte: threeDaysFromNow },
        'planDetails.status': 'active'
      }).lean(); // Use .lean() for faster, read-only queries

      if (usersToRemind.length > 0) {
        logger.info(`Found ${usersToRemind.length} users to remind for subscription renewal.`);
        const reminderPromises = usersToRemind.map(user => 
          sendEmail({
            to: user.email,
            ...emailTemplates.subscriptionRenewal(
              user.username,
              user.plan,
              user.planDetails.price, // Assumes price is stored in planDetails
              user.planDetails.nextBillingDate
            )
          }).catch(err => logger.error(`Failed to send renewal email to ${user.email}`, err))
        );
        await Promise.all(reminderPromises);
      }

      // --- Handle Expired Subscriptions ---
      const expiredUsers = await User.find({
        'planDetails.nextBillingDate': { $lt: new Date() },
        'planDetails.status': 'active'
      }); // Not using .lean() as we need to save these documents

      if (expiredUsers.length > 0) {
        logger.info(`Found ${expiredUsers.length} users with expired subscriptions.`);
        const expirationPromises = expiredUsers.map(user => {
          user.planDetails.status = 'past_due';
          return Promise.all([
            user.save(),
            sendEmail({
              to: user.email,
              ...emailTemplates.subscriptionExpired(user.username, user.plan)
            }).catch(err => logger.error(`Failed to send expiration email to ${user.email}`, err))
          ]);
        });
        await Promise.all(expirationPromises);
      }
      logger.info('Subscription management cron job finished successfully.');
    } catch (error) {
      logger.error('A critical error occurred in the subscription management cron job:', error);
    }
  }, {
    scheduled: true,
    timezone: CRON_TIMEZONE,
  });

  // --- Log Archiving Cron ---
  // Runs daily at 1 AM UTC.
  cron.schedule('0 1 * * *', async () => {
    logger.info('Running log archiving cron job...');
    try {
      await logArchiver.archiveOldLogs();
      logger.info('Log archiving cron job finished successfully.');
    } catch (error) {
      logger.error('Log archiving cron job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: CRON_TIMEZONE,
  });

  // --- Old Archives Cleanup Cron ---
  // Runs on the 1st of every month at 2 AM UTC.
  cron.schedule('0 2 1 * *', async () => {
    logger.info('Running old archives cleanup cron job...');
    try {
      await logArchiver.cleanupOldArchives();
      logger.info('Old archives cleanup cron job finished successfully.');
    } catch (error) {
      logger.error('Old archives cleanup cron job failed:', error);
    }
  }, {
    scheduled: true,
    timezone: CRON_TIMEZONE,
  });

  logger.info('Cron jobs initialized.');
};
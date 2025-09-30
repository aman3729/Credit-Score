import { BaseService } from './BaseService.js';
import { logger } from '../../config/logger.js';
import AppError from '../../utils/appError.js';

/**
 * Notification service for handling in-app notifications and real-time messaging
 */
export class NotificationService extends BaseService {
  constructor() {
    super(null); // No specific model for notifications
    this.io = null;
  }

  /**
   * Set Socket.IO instance
   * @param {Object} io - Socket.IO instance
   */
  setIO(io) {
    this.io = io;
  }

  /**
   * Send notification to user
   * @param {string} userId - User ID
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Notification result
   */
  async sendNotification(userId, notification) {
    try {
      const {
        type = 'info',
        title,
        message,
        data = {},
        priority = 'normal',
        expiresAt = null
      } = notification;

      const notificationData = {
        id: this.generateNotificationId(),
        type,
        title,
        message,
        data,
        priority,
        createdAt: new Date(),
        expiresAt,
        read: false
      };

      // Send real-time notification if WebSocket is available
      if (this.io) {
        this.io.to(`user_${userId}`).emit('notification', notificationData);
      }

      logger.info('Notification sent', {
        userId,
        notificationId: notificationData.id,
        type,
        title
      });

      return notificationData;
    } catch (error) {
      logger.error('Failed to send notification', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Send notification to multiple users
   * @param {Array} userIds - Array of user IDs
   * @param {Object} notification - Notification data
   * @returns {Promise<Array>} Notification results
   */
  async sendBulkNotification(userIds, notification) {
    try {
      const results = [];

      for (const userId of userIds) {
        try {
          const result = await this.sendNotification(userId, notification);
          results.push({ userId, success: true, notification: result });
        } catch (error) {
          results.push({ userId, success: false, error: error.message });
        }
      }

      logger.info('Bulk notification sent', {
        totalUsers: userIds.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });

      return results;
    } catch (error) {
      logger.error('Failed to send bulk notification', { error: error.message });
      throw error;
    }
  }

  /**
   * Send system-wide notification
   * @param {Object} notification - Notification data
   * @returns {Promise<Object>} Notification result
   */
  async sendSystemNotification(notification) {
    try {
      if (!this.io) {
        throw new AppError('WebSocket not available', 500);
      }

      const notificationData = {
        id: this.generateNotificationId(),
        type: 'system',
        title: notification.title,
        message: notification.message,
        data: notification.data || {},
        priority: notification.priority || 'normal',
        createdAt: new Date(),
        expiresAt: notification.expiresAt,
        read: false
      };

      // Broadcast to all connected users
      this.io.emit('system_notification', notificationData);

      logger.info('System notification sent', {
        notificationId: notificationData.id,
        title: notificationData.title
      });

      return notificationData;
    } catch (error) {
      logger.error('Failed to send system notification', { error: error.message });
      throw error;
    }
  }

  /**
   * Send credit score update notification
   * @param {string} userId - User ID
   * @param {number} oldScore - Previous credit score
   * @param {number} newScore - New credit score
   * @returns {Promise<Object>} Notification result
   */
  async sendCreditScoreUpdateNotification(userId, oldScore, newScore) {
    const change = newScore - oldScore;
    const changeText = change > 0 ? 'increased' : change < 0 ? 'decreased' : 'remained the same';
    const type = change > 0 ? 'success' : change < 0 ? 'warning' : 'info';

    return this.sendNotification(userId, {
      type,
      title: 'Credit Score Updated',
      message: `Your credit score has ${changeText} from ${oldScore} to ${newScore}.`,
      data: {
        oldScore,
        newScore,
        change,
        changeText
      },
      priority: change !== 0 ? 'high' : 'normal'
    });
  }

  /**
   * Send upload completion notification
   * @param {string} userId - User ID
   * @param {Object} uploadResults - Upload results
   * @returns {Promise<Object>} Notification result
   */
  async sendUploadCompletionNotification(userId, uploadResults) {
    const { totalRecords, successful, failed } = uploadResults;
    const type = failed === 0 ? 'success' : failed > 0 && successful > 0 ? 'warning' : 'error';

    return this.sendNotification(userId, {
      type,
      title: 'Upload Completed',
      message: `Upload completed: ${successful} successful, ${failed} failed out of ${totalRecords} records.`,
      data: uploadResults,
      priority: failed > 0 ? 'high' : 'normal'
    });
  }

  /**
   * Send security alert notification
   * @param {string} userId - User ID
   * @param {Object} securityEvent - Security event details
   * @returns {Promise<Object>} Notification result
   */
  async sendSecurityAlertNotification(userId, securityEvent) {
    return this.sendNotification(userId, {
      type: 'error',
      title: 'Security Alert',
      message: `Suspicious activity detected: ${securityEvent.type}`,
      data: securityEvent,
      priority: 'critical'
    });
  }

  /**
   * Send welcome notification
   * @param {string} userId - User ID
   * @param {string} userName - User name
   * @returns {Promise<Object>} Notification result
   */
  async sendWelcomeNotification(userId, userName) {
    return this.sendNotification(userId, {
      type: 'success',
      title: 'Welcome!',
      message: `Welcome to Credit Score Dashboard, ${userName}! Your account has been created successfully.`,
      data: {
        userName,
        welcomeMessage: true
      },
      priority: 'normal'
    });
  }

  /**
   * Mark notification as read
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Update result
   */
  async markNotificationAsRead(userId, notificationId) {
    try {
      // This would typically update a database record
      // For now, just log the action
      logger.info('Notification marked as read', {
        userId,
        notificationId
      });

      return { success: true, notificationId };
    } catch (error) {
      logger.error('Failed to mark notification as read', {
        userId,
        notificationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get user notifications
   * @param {string} userId - User ID
   * @param {Object} options - Query options
   * @returns {Promise<Array>} User notifications
   */
  async getUserNotifications(userId, options = {}) {
    try {
      const { limit = 20, unreadOnly = false } = options;

      // This would typically query a database
      // For now, return empty array
      const notifications = [];

      logger.info('User notifications retrieved', {
        userId,
        count: notifications.length
      });

      return notifications;
    } catch (error) {
      logger.error('Failed to get user notifications', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Delete notification
   * @param {string} userId - User ID
   * @param {string} notificationId - Notification ID
   * @returns {Promise<Object>} Delete result
   */
  async deleteNotification(userId, notificationId) {
    try {
      // This would typically delete from database
      logger.info('Notification deleted', {
        userId,
        notificationId
      });

      return { success: true, notificationId };
    } catch (error) {
      logger.error('Failed to delete notification', {
        userId,
        notificationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get notification statistics
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Notification statistics
   */
  async getNotificationStats(userId) {
    try {
      // This would typically query database
      const stats = {
        total: 0,
        unread: 0,
        read: 0,
        byType: {
          info: 0,
          success: 0,
          warning: 0,
          error: 0
        }
      };

      return stats;
    } catch (error) {
      logger.error('Failed to get notification stats', {
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate unique notification ID
   * @returns {string} Notification ID
   */
  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Subscribe user to notifications
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   * @returns {Promise<Object>} Subscription result
   */
  async subscribeUser(userId, socketId) {
    try {
      if (!this.io) {
        throw new AppError('WebSocket not available', 500);
      }

      // Join user-specific room
      this.io.sockets.sockets.get(socketId)?.join(`user_${userId}`);

      logger.info('User subscribed to notifications', {
        userId,
        socketId
      });

      return { success: true, userId, socketId };
    } catch (error) {
      logger.error('Failed to subscribe user to notifications', {
        userId,
        socketId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Unsubscribe user from notifications
   * @param {string} userId - User ID
   * @param {string} socketId - Socket ID
   * @returns {Promise<Object>} Unsubscription result
   */
  async unsubscribeUser(userId, socketId) {
    try {
      if (!this.io) {
        throw new AppError('WebSocket not available', 500);
      }

      // Leave user-specific room
      this.io.sockets.sockets.get(socketId)?.leave(`user_${userId}`);

      logger.info('User unsubscribed from notifications', {
        userId,
        socketId
      });

      return { success: true, userId, socketId };
    } catch (error) {
      logger.error('Failed to unsubscribe user from notifications', {
        userId,
        socketId,
        error: error.message
      });
      throw error;
    }
  }
} 
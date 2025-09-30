import { Server } from 'socket.io';
import { logger } from '../../config/logger.js';

/**
 * WebSocket manager for handling real-time communications
 */
export class WebSocketManager {
  constructor(server) {
    this.server = server;
    this.io = null;
    this.connections = new Map();
  }

  /**
   * Initialize Socket.IO server
   */
  initialize() {
    const corsOptions = {
      origin: this.getCorsOrigins(),
      methods: ['GET', 'POST'],
      credentials: true
    };

    this.io = new Server(this.server, {
      cors: corsOptions,
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      allowEIO3: true,
      pingTimeout: 60000,
      pingInterval: 25000
    });

    this.setupEventHandlers();
    logger.info('WebSocket server initialized');
    
    return this.io;
  }

  /**
   * Setup Socket.IO event handlers
   */
  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
    });

    this.io.on('error', (error) => {
      logger.error('WebSocket error:', error);
    });
  }

  /**
   * Handle new socket connection
   */
  handleConnection(socket) {
    logger.info(`User connected: ${socket.id}`);
    
    // Store connection
    this.connections.set(socket.id, {
      id: socket.id,
      connectedAt: new Date(),
      user: null
    });

    // Handle authentication
    socket.on('authenticate', (data) => {
      this.handleAuthentication(socket, data);
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      this.handleDisconnection(socket, reason);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for ${socket.id}:`, error);
    });

    // Handle custom events
    this.setupCustomEvents(socket);
  }

  /**
   * Handle socket authentication
   */
  async handleAuthentication(socket, data) {
    try {
      // TODO: Implement proper authentication logic
      // For now, just acknowledge the authentication
      socket.emit('authenticated', { success: true });
      
      const connection = this.connections.get(socket.id);
      if (connection) {
        connection.user = data.userId;
      }
      
      logger.info(`User authenticated: ${socket.id}`);
    } catch (error) {
      logger.error(`Authentication failed for ${socket.id}:`, error);
      socket.emit('authentication_error', { message: 'Authentication failed' });
    }
  }

  /**
   * Handle socket disconnection
   */
  handleDisconnection(socket, reason) {
    logger.info(`User disconnected: ${socket.id}, reason: ${reason}`);
    
    // Remove from connections map
    this.connections.delete(socket.id);
  }

  /**
   * Setup custom event handlers
   */
  setupCustomEvents(socket) {
    // Credit score updates
    socket.on('credit_score_update', (data) => {
      this.handleCreditScoreUpdate(socket, data);
    });

    // Upload progress
    socket.on('upload_progress', (data) => {
      this.handleUploadProgress(socket, data);
    });

    // Real-time notifications
    socket.on('notification', (data) => {
      this.handleNotification(socket, data);
    });
  }

  /**
   * Handle credit score update events
   */
  handleCreditScoreUpdate(socket, data) {
    try {
      // Broadcast to relevant users
      socket.broadcast.emit('credit_score_updated', data);
      logger.debug(`Credit score update broadcasted: ${socket.id}`);
    } catch (error) {
      logger.error(`Error handling credit score update:`, error);
    }
  }

  /**
   * Handle upload progress events
   */
  handleUploadProgress(socket, data) {
    try {
      // Send progress to specific user
      socket.emit('upload_progress_update', data);
      logger.debug(`Upload progress updated: ${socket.id}`);
    } catch (error) {
      logger.error(`Error handling upload progress:`, error);
    }
  }

  /**
   * Handle notification events
   */
  handleNotification(socket, data) {
    try {
      // Broadcast notification to relevant users
      socket.broadcast.emit('notification_received', data);
      logger.debug(`Notification broadcasted: ${socket.id}`);
    } catch (error) {
      logger.error(`Error handling notification:`, error);
    }
  }

  /**
   * Get CORS origins for WebSocket
   */
  getCorsOrigins() {
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:5177';
    }
    return process.env.CORS_ORIGINS?.split(',') || '*';
  }

  /**
   * Get active connections count
   */
  getActiveConnectionsCount() {
    return this.connections.size;
  }

  /**
   * Get connection info
   */
  getConnectionInfo(socketId) {
    return this.connections.get(socketId);
  }

  /**
   * Broadcast message to all connected clients
   */
  broadcast(event, data) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }

  /**
   * Send message to specific user
   */
  sendToUser(userId, event, data) {
    if (this.io) {
      // Find socket by user ID
      for (const [socketId, connection] of this.connections) {
        if (connection.user === userId) {
          this.io.to(socketId).emit(event, data);
          break;
        }
      }
    }
  }

  /**
   * Get the Socket.IO instance
   */
  getIO() {
    return this.io;
  }
}

/**
 * Initialize WebSocket server
 * @param {http.Server|https.Server} server - HTTP/HTTPS server instance
 * @returns {SocketIO.Server} Socket.IO server instance
 */
export function initializeWebSocket(server) {
  const wsManager = new WebSocketManager(server);
  return wsManager.initialize();
} 
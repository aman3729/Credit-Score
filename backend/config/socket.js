import { Server } from 'socket.io';

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:5175',
        'http://localhost:5176',
        'http://localhost:5177',
        process.env.FRONTEND_URL
      ].filter(Boolean),
      methods: ['GET', 'POST'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Timestamp']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Handle user authentication
    socket.on('authenticate', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`User ${userId} authenticated`);
    });

    // Handle admin authentication
    socket.on('authenticateAdmin', (adminId) => {
      socket.join('admins');
      console.log(`Admin ${adminId} authenticated`);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

export const emitToUser = (userId, event, data) => {
  getIO().to(`user_${userId}`).emit(event, data);
};

export const emitToAdmins = (event, data) => {
  getIO().to('admins').emit(event, data);
};

export const broadcastScoreUpdate = (userId, score) => {
  emitToUser(userId, 'scoreUpdate', { score });
  emitToAdmins('userScoreUpdate', { userId, score });
};

export default { initSocket, getIO, emitToUser, emitToAdmins, broadcastScoreUpdate }; 
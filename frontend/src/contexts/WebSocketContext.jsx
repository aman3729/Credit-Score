import React, { createContext, useContext, useEffect, useState } from 'react';
import io from 'socket.io-client';

export const WebSocketContext = createContext(null);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

export const WebSocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(import.meta.env.VITE_WS_URL || 'ws://localhost:3000', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('WebSocket disconnected');
      setConnected(false);
    });

    newSocket.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  const subscribe = (event, callback) => {
    if (!socket) return;
    socket.on(event, callback);
    return () => socket.off(event, callback);
  };

  const emit = (event, data) => {
    if (!socket) return;
    socket.emit(event, data);
  };

  const value = {
    socket,
    connected,
    subscribe,
    emit
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// No default export to avoid Fast Refresh issues 
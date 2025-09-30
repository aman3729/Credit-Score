import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { message } from 'antd';

export const useRealTimeMonitoring = (endpoint = '/ws/monitoring') => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [uploadProgress, setUploadProgress] = useState({});
  const [systemStatus, setSystemStatus] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState(null);
  
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // WebSocket event handlers
  const handleOpen = useCallback(() => {
    setIsConnected(true);
    setConnectionStatus('connected');
    setError(null);
    reconnectAttemptsRef.current = 0;
    
    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // 30 seconds
    
    message.success('Real-time monitoring connected');
  }, []);

  const handleClose = useCallback((event) => {
    setIsConnected(false);
    setConnectionStatus('disconnected');
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // Attempt to reconnect if not a clean close
    if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
      setConnectionStatus('reconnecting');
      reconnectAttemptsRef.current++;
      
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, Math.pow(2, reconnectAttemptsRef.current) * 1000); // Exponential backoff
    }
  }, []);

  const handleError = useCallback((error) => {
    setError(`WebSocket error: ${error.message}`);
    setConnectionStatus('error');
    message.error('Real-time monitoring connection error');
  }, []);

  const handleMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'upload_progress':
          setUploadProgress(prev => ({
            ...prev,
            [data.uploadId]: {
              ...data.progress,
              timestamp: Date.now()
            }
          }));
          break;
          
        case 'system_status':
          setSystemStatus({
            ...data.status,
            timestamp: Date.now()
          });
          break;
          
        case 'notification':
          setNotifications(prev => [
            {
              id: Date.now(),
              type: data.notification.type,
              title: data.notification.title,
              message: data.notification.message,
              timestamp: Date.now(),
              read: false
            },
            ...prev.slice(0, 49) // Keep last 50 notifications
          ]);
          
          // Show notification based on type
          switch (data.notification.type) {
            case 'success':
              message.success(data.notification.message);
              break;
            case 'warning':
              message.warning(data.notification.message);
              break;
            case 'error':
              message.error(data.notification.message);
              break;
            case 'info':
              message.info(data.notification.message);
              break;
          }
          break;
          
        case 'pong':
          // Heartbeat response
          break;
          
        default:
          console.log('Unknown message type:', data.type);
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  }, []);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${endpoint}`;
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = handleOpen;
      wsRef.current.onclose = handleClose;
      wsRef.current.onerror = handleError;
      wsRef.current.onmessage = handleMessage;
      
      setConnectionStatus('connecting');
    } catch (err) {
      setError(`Failed to connect: ${err.message}`);
      setConnectionStatus('error');
    }
  }, [endpoint, handleOpen, handleClose, handleError, handleMessage]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close(1000, 'User disconnect');
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  }, []);

  // Subscribe to upload progress
  const subscribeToUpload = useCallback((uploadId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_upload',
        uploadId: uploadId
      }));
    }
  }, []);

  // Unsubscribe from upload progress
  const unsubscribeFromUpload = useCallback((uploadId) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'unsubscribe_upload',
        uploadId: uploadId
      }));
    }
  }, []);

  // Subscribe to system status
  const subscribeToSystemStatus = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'subscribe_system_status'
      }));
    }
  }, []);

  // Mark notification as read
  const markNotificationAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === notificationId 
          ? { ...notification, read: true }
          : notification
      )
    );
  }, []);

  // Mark all notifications as read
  const markAllNotificationsAsRead = useCallback(() => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Get unread notification count
  const unreadCount = useMemo(() => 
    notifications.filter(n => !n.read).length, 
    [notifications]
  );

  // Get upload progress for specific upload
  const getUploadProgress = useCallback((uploadId) => {
    return uploadProgress[uploadId] || null;
  }, [uploadProgress]);

  // Get system health status
  const getSystemHealth = useCallback(() => {
    const status = systemStatus;
    if (!status) return 'unknown';
    
    if (status.systemLoad > 90) return 'critical';
    if (status.systemLoad > 75) return 'warning';
    if (status.systemLoad > 50) return 'moderate';
    return 'healthy';
  }, [systemStatus]);

  // Initialize connection on mount
  useEffect(() => {
    connect();
    
    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    // State
    isConnected,
    connectionStatus,
    uploadProgress,
    systemStatus,
    notifications,
    error,
    unreadCount,
    
    // Actions
    connect,
    disconnect,
    subscribeToUpload,
    unsubscribeFromUpload,
    subscribeToSystemStatus,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotifications,
    
    // Utilities
    getUploadProgress,
    getSystemHealth,
    clearError: () => setError(null)
  };
}; 
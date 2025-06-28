import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import api from '../utils/api';

const SecurityAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { subscribe } = useWebSocket();

  useEffect(() => {
    // Subscribe to real-time security alerts
    const unsubscribe = subscribe('securityAlert', (alert) => {
      setAlerts(prevAlerts => [alert, ...prevAlerts]);
    });

    // Subscribe to alert acknowledgments
    const unsubscribeAck = subscribe('alertAcknowledged', ({ alertId }) => {
      setAlerts(prevAlerts =>
        prevAlerts.map(alert =>
          alert.alertId === alertId
            ? { ...alert, acknowledged: true }
            : alert
        )
      );
    });

    // Fetch initial alerts
    fetchAlerts();

    return () => {
      unsubscribe();
      unsubscribeAck();
    };
  }, [subscribe]);

  const fetchAlerts = async () => {
    try {
      const data = await api.get('/admin/security-stats');
      setAlerts(data.recentEvents || []);
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleAcknowledge = async (alertId) => {
    try {
      await api.post(`/admin/alerts/${alertId}/acknowledge`);
      // The component will receive an 'alertAcknowledged' WebSocket event,
      // which will update the UI. No need to manually set state here.
    } catch (err) {
      console.error('Error acknowledging alert:', err);
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    }
  };

  const getAlertIcon = (type) => {
    switch (type) {
      case 'failed_login':
        return (
          <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0 0v2m0-2h2m-2 0H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'rate_limit_exceeded':
        return (
          <svg className="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      default:
        return (
          <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg">
        <div className="text-red-600 dark:text-red-200">
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
      <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">
        Security Alerts
      </h2>

      {alerts.length === 0 ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No active security alerts.
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.alertId}
              className="flex items-start p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex-shrink-0">
                {getAlertIcon(alert.type)}
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {alert.message}
                  </p>
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getSeverityColor(alert.severity)}`}>
                    {alert.severity}
                  </span>
                </div>
                <div className="mt-1">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    IP: {alert.ip || 'N/A'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Time: {new Date(alert.timestamp).toLocaleString()}
                  </p>
                </div>
                {!alert.acknowledged && (
                  <button
                    onClick={() => handleAcknowledge(alert.alertId)}
                    className="mt-2 px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Acknowledge
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SecurityAlerts; 
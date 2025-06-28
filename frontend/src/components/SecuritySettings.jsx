import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const SecuritySettings = ({ user = null }) => {
  // Provide safe defaults for user properties
  const safeUser = {
    email: '',
    name: '',
    ...user
  };
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [setupStep, setSetupStep] = useState(0);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [notificationPreferences, setNotificationPreferences] = useState({
    email: {
      scoreUpdates: true,
      securityAlerts: true,
      newsAndTips: false
    },
    push: {
      scoreUpdates: true,
      securityAlerts: true,
      newsAndTips: false
    }
  });
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    fetchSecuritySettings();
  }, []);

  const fetchSecuritySettings = async () => {
    try {
      const data = await api.get('/security/settings');
      setTwoFactorEnabled(data.twoFactorEnabled || false);
      setNotificationPreferences(data.notificationPreferences || {
        email: {
          scoreUpdates: true,
          securityAlerts: true,
          newsAndTips: false
        },
        push: {
          scoreUpdates: true,
          securityAlerts: true,
          newsAndTips: false
        }
      });
      setDevices(data.devices || []);
      setError(null);
    } catch (error) {
      console.error('Failed to load security settings:', error);
      setError('Failed to load security settings. Please try again later.');
    } finally {
      setLoading(false);
      setIsInitialized(true);
    }
  };

  const enable2FA = async () => {
    try {
      const data = await api.post('/security/2fa/enable');
      setQrCode(data.qrCode);
      setSecret(data.secret);
      setSetupStep(1);
    } catch (error) {
      setError('Failed to enable 2FA');
    }
  };

  const verify2FA = async () => {
    try {
      await api.post('/security/2fa/verify', { token });
      setTwoFactorEnabled(true);
      setSetupStep(0);
    } catch (error) {
      setError('Invalid verification code');
    }
  };

  const disable2FA = async () => {
    try {
      await api.post('/security/2fa/disable', { token });
      setTwoFactorEnabled(false);
    } catch (error) {
      setError('Failed to disable 2FA');
    }
  };

  const updateNotificationPreferences = async (type, setting, value) => {
    try {
      await api.put('/security/notifications/preferences', { [type]: { [setting]: value } });
      setNotificationPreferences(prev => ({
        ...prev,
        [type]: {
          ...prev[type],
          [setting]: value
        }
      }));
    } catch (error) {
      setError('Failed to update notification preferences');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  // Show loading state if user data is not available yet
  if (!user) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Security Settings
        </h2>
        {safeUser.email && (
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Logged in as: {safeUser.email}
          </span>
        )}
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-200 rounded-lg">
          {error}
        </div>
      )}

      {/* Two-Factor Authentication */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Two-Factor Authentication
        </h3>
        
        {setupStep === 0 ? (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 dark:text-gray-400">
                {twoFactorEnabled
                  ? 'Two-factor authentication is enabled'
                  : 'Protect your account with two-factor authentication'}
              </p>
            </div>
            <button
              onClick={twoFactorEnabled ? disable2FA : enable2FA}
              className={`px-4 py-2 rounded-lg ${
                twoFactorEnabled
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              } text-white`}
            >
              {twoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img src={qrCode} alt="2FA QR Code" className="border p-4 rounded-lg" />
            </div>
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                Scan this QR code with your authenticator app or enter the code manually:
              </p>
              <code className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded">
                {secret}
              </code>
            </div>
            <div className="flex items-center space-x-4">
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Enter verification code"
                className="flex-1 p-2 border rounded-lg dark:bg-gray-800 dark:border-gray-700"
              />
              <button
                onClick={verify2FA}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
              >
                Verify
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Notification Preferences */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Notification Preferences
        </h3>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Email Notifications</h4>
            <div className="space-y-2">
              {Object.entries(notificationPreferences.email).map(([key, value]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updateNotificationPreferences('email', key, e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Push Notifications</h4>
            <div className="space-y-2">
              {Object.entries(notificationPreferences.push).map(([key, value]) => (
                <label key={key} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={(e) => updateNotificationPreferences('push', key, e.target.checked)}
                    className="form-checkbox h-5 w-5 text-blue-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-300">
                    {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Connected Devices */}
      <div>
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-4">
          Connected Devices
        </h3>
        
        <div className="space-y-4">
          {devices.map((device, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div>
                <p className="font-medium text-gray-800 dark:text-gray-200">{device.deviceName}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Last used: {new Date(device.lastUsed).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => {/* Handle device removal */}}
                className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
              >
                <i className="fas fa-trash"></i>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SecuritySettings; 
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Notification, NotificationTypes } from './ui/notification';
import { 
  Bell, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Eye,
  Settings,
  X,
  TrendingUp,
  CreditCard,
  FileText
} from 'lucide-react';

const PremiumAlerts = ({ user }) => {
  const [alerts, setAlerts] = useState([
    {
      id: 1,
      type: 'security',
      title: 'New Login Detected',
      description: 'Login from new device in New York, NY. If this wasn\'t you, please review your account security.',
      time: '2 hours ago',
      priority: 'medium',
      read: false,
      icon: Shield,
      variant: 'info',
      badge: { text: 'Security', variant: 'secondary' },
      actions: [
        {
          label: 'Review',
          variant: 'outline',
          icon: Eye,
          onClick: () => console.log('Review security alert')
        },
        {
          label: 'Secure Account',
          variant: 'default',
          onClick: () => console.log('Secure account')
        }
      ]
    },
    {
      id: 2,
      type: 'credit',
      title: 'Credit Score Improved',
      description: 'Your score increased by 5 points this week. Great job maintaining good credit habits!',
      time: '1 day ago',
      priority: 'low',
      read: false,
      icon: TrendingUp,
      variant: 'success',
      badge: { text: 'Positive', variant: 'default' },
      actions: [
        {
          label: 'View Details',
          variant: 'outline',
          icon: Eye,
          onClick: () => console.log('View credit details')
        },
        {
          label: 'Download Report',
          variant: 'default',
          icon: FileText,
          onClick: () => console.log('Download report')
        }
      ]
    },
    {
      id: 3,
      type: 'warning',
      title: 'Payment Due Soon',
      description: 'Credit card payment is due soon. Consider setting up automatic payments.',
      time: '2 days ago',
      priority: 'high',
      read: true,
      icon: AlertTriangle,
      variant: 'warning',
      badge: { text: 'Urgent', variant: 'destructive' },
      actions: [
        {
          label: 'Pay Now',
          variant: 'default',
          icon: CreditCard,
          onClick: () => console.log('Pay now')
        },
        {
          label: 'Set Reminder',
          variant: 'outline',
          onClick: () => console.log('Set reminder')
        }
      ]
    },
    {
      id: 4,
      type: 'credit',
      title: 'New Credit Inquiry',
      description: 'A new credit inquiry was made by ABC Bank. This is normal if you recently applied for credit.',
      time: '3 days ago',
      priority: 'medium',
      read: true,
      icon: FileText,
      variant: 'info',
      badge: { text: 'Inquiry', variant: 'secondary' },
      actions: [
        {
          label: 'View Details',
          variant: 'outline',
          icon: Eye,
          onClick: () => console.log('View inquiry details')
        }
      ]
    }
  ]);

  const [showSettings, setShowSettings] = useState(false);
  const [alertPreferences, setAlertPreferences] = useState({
    security: true,
    credit: true,
    payments: true,
    inquiries: false,
    offers: true
  });

  const unreadCount = alerts.filter(alert => !alert.read).length;

  const markAsRead = (alertId) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
  };

  const dismissAlert = (alertId) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  const togglePreference = (preference) => {
    setAlertPreferences(prev => ({
      ...prev,
      [preference]: !prev[preference]
    }));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 dark:text-red-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'low': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-500" />
            <span>Alerts & Notifications</span>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
              className="p-2"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-medium">All clear!</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              No new alerts at this time
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div 
                  key={alert.id} 
                  className={`transition-all duration-200 ${
                    alert.read 
                      ? 'opacity-75' 
                      : 'opacity-100'
                  } bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex items-start gap-4`}
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
                      {Icon && React.createElement(Icon, { className: 'h-6 w-6' })}
                    </div>
                  </div>
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900 dark:text-white truncate">{alert.title}</span>
                      {alert.badge && (
                        <Badge variant={alert.badge.variant || 'secondary'} className="text-xs">
                          {alert.badge.text}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{alert.description}</p>
                    <p className={`text-xs mt-2 ${getPriorityColor(alert.priority)}`}>{alert.time}</p>
                    {/* Actions */}
                    {alert.actions && alert.actions.length > 0 && (
                      <div className="flex items-center gap-2 mt-4">
                        {alert.actions.map((action, idx) => (
                          <Button
                            key={action.label + idx}
                            variant={action.variant || 'outline'}
                            size="sm"
                            onClick={action.onClick}
                            className="text-xs"
                          >
                            {action.icon && React.createElement(action.icon, { className: 'h-3 w-3 mr-1' })}
                            {action.label}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Dismiss button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissAlert(alert.id)}
                    className="flex-shrink-0 p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Alert Settings */}
        {showSettings && (
          <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-medium text-gray-900 dark:text-white">
                Alert Preferences
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowSettings(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-3 text-sm">
              {Object.entries(alertPreferences).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {key} Alerts
                  </span>
                  <Button
                    variant={enabled ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePreference(key)}
                    className="text-xs"
                  >
                    {enabled ? "Enabled" : "Disabled"}
                  </Button>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button variant="outline" size="sm" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Advanced Settings
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default React.memo(PremiumAlerts); 
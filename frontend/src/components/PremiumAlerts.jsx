import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Bell, 
  Shield, 
  AlertTriangle, 
  CheckCircle,
  Clock,
  Eye
} from 'lucide-react';

const PremiumAlerts = ({ user }) => {
  const alerts = [
    {
      id: 1,
      type: 'security',
      title: 'New Login Detected',
      description: 'Login from new device in New York, NY',
      time: '2 hours ago',
      priority: 'medium',
      read: false,
      icon: Shield
    },
    {
      id: 2,
      type: 'credit',
      title: 'Credit Score Improved',
      description: 'Your score increased by 5 points this week',
      time: '1 day ago',
      priority: 'low',
      read: false,
      icon: CheckCircle
    },
    {
      id: 3,
      type: 'warning',
      title: 'Payment Due Soon',
      description: 'Credit card payment due in 3 days',
      time: '2 days ago',
      priority: 'high',
      read: true,
      icon: AlertTriangle
    }
  ];

  const getAlertColor = (type) => {
    switch (type) {
      case 'security': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'credit': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const unreadCount = alerts.filter(alert => !alert.read).length;

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Bell className="h-5 w-5 text-blue-500" />
            <span>Alerts & Notifications</span>
          </div>
          {unreadCount > 0 && (
            <Badge className="bg-red-500 text-white">
              {unreadCount}
            </Badge>
          )}
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
          <div className="space-y-3">
            {alerts.map((alert) => {
              const Icon = alert.icon;
              return (
                <div 
                  key={alert.id} 
                  className={`p-4 border rounded-lg transition-colors ${
                    alert.read 
                      ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800' 
                      : 'border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-900/20'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Icon className={`h-4 w-4 ${
                        alert.type === 'security' ? 'text-blue-500' :
                        alert.type === 'credit' ? 'text-green-500' :
                        alert.type === 'warning' ? 'text-red-500' : 'text-gray-500'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className={`font-medium ${
                          alert.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'
                        }`}>
                          {alert.title}
                        </h3>
                        <Badge className={`text-xs ${getAlertColor(alert.type)}`}>
                          {alert.type}
                        </Badge>
                      </div>
                      <p className={`text-sm mb-2 ${
                        alert.read ? 'text-gray-500 dark:text-gray-500' : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        {alert.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{alert.time}</span>
                          <span className={`font-medium ${getPriorityColor(alert.priority)}`}>
                            {alert.priority} priority
                          </span>
                        </div>
                        {!alert.read && (
                          <Button size="sm" variant="ghost" className="h-6 px-2">
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Alert Settings */}
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            Alert Preferences
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Security Alerts</span>
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                Enabled
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Credit Score Changes</span>
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                Enabled
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600 dark:text-gray-400">Payment Reminders</span>
              <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                Enabled
              </Badge>
            </div>
          </div>
          <Button variant="outline" size="sm" className="w-full mt-3">
            Manage Alerts
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumAlerts; 
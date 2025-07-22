import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useToast } from '../hooks/use-toast';
import { 
  Notification, 
  NotificationContainer, 
  NotificationTypes,
  NotificationGroup 
} from './ui/notification';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  AlertTriangle, 
  Bell, 
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileText,
  CreditCard,
  TrendingUp
} from 'lucide-react';

const NotificationDemo = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Toast examples
  const showToastExamples = () => {
    // Success toast
    toast({
      title: "Success!",
      description: "Your credit score has been updated successfully.",
      variant: "success",
      duration: 5000,
    });

    // Error toast
    setTimeout(() => {
      toast({
        title: "Error",
        description: "Failed to update credit information. Please try again.",
        variant: "destructive",
        duration: 5000,
      });
    }, 1000);

    // Warning toast
    setTimeout(() => {
      toast({
        title: "Warning",
        description: "Your credit score has decreased by 5 points.",
        variant: "warning",
        duration: 5000,
      });
    }, 2000);

    // Info toast
    setTimeout(() => {
      toast({
        title: "Information",
        description: "New credit monitoring features are now available.",
        variant: "info",
        duration: 5000,
      });
    }, 3000);

    // Notification toast
    setTimeout(() => {
      toast({
        title: "New Alert",
        description: "A new credit inquiry was detected on your account.",
        variant: "notification",
        duration: 5000,
      });
    }, 4000);
  };

  // Add notification examples
  const addNotificationExamples = () => {
    const newNotifications = [
      {
        id: Date.now(),
        variant: "success",
        title: "Credit Score Updated",
        description: "Your credit score has increased by 15 points!",
        timestamp: "2 minutes ago",
        badge: { text: "New", variant: "default" },
        actions: [
          {
            label: "View Details",
            variant: "outline",
            icon: Eye,
            onClick: () => console.log("View details clicked")
          },
          {
            label: "Download Report",
            variant: "default",
            icon: Download,
            onClick: () => console.log("Download clicked")
          }
        ]
      },
      {
        id: Date.now() + 1,
        variant: "warning",
        title: "Payment Due Soon",
        description: "Your credit card payment is due in 3 days.",
        timestamp: "5 minutes ago",
        badge: { text: "Urgent", variant: "destructive" },
        actions: [
          {
            label: "Pay Now",
            variant: "default",
            onClick: () => console.log("Pay now clicked")
          }
        ]
      },
      {
        id: Date.now() + 2,
        variant: "info",
        title: "New Credit Card Offer",
        description: "You're pre-approved for a new credit card with 0% APR.",
        timestamp: "10 minutes ago",
        badge: { text: "Offer", variant: "secondary" },
        actions: [
          {
            label: "Learn More",
            variant: "outline",
            icon: ExternalLink,
            onClick: () => console.log("Learn more clicked")
          }
        ]
      },
      {
        id: Date.now() + 3,
        variant: "error",
        title: "Failed Transaction",
        description: "Your recent payment could not be processed.",
        timestamp: "15 minutes ago",
        badge: { text: "Failed", variant: "destructive" },
        actions: [
          {
            label: "Retry",
            variant: "default",
            onClick: () => console.log("Retry clicked")
          },
          {
            label: "Contact Support",
            variant: "outline",
            onClick: () => console.log("Contact support clicked")
          }
        ]
      }
    ];

    setNotifications(prev => [...newNotifications, ...prev]);
    setShowNotifications(true);
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setShowNotifications(false);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          Notification System Demo
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Explore the enhanced notification and toast system
        </p>
      </div>

      {/* Demo Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-blue-500" />
              Toast Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Show various toast notification examples that appear in the top-right corner.
            </p>
            <Button onClick={showToastExamples} className="w-full">
              Show Toast Examples
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              Persistent Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Add persistent notifications that stay until dismissed.
            </p>
            <Button onClick={addNotificationExamples} className="w-full">
              Add Notification Examples
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Notification Examples */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Success Notification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              Success Notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationTypes.Success
              title="Credit Score Improved"
              description="Your credit score has increased by 25 points this month!"
              timestamp="Just now"
              badge={{ text: "New", variant: "default" }}
              actions={[
                {
                  label: "View Report",
                  variant: "outline",
                  icon: Eye,
                  onClick: () => console.log("View report")
                }
              ]}
            />
          </CardContent>
        </Card>

        {/* Error Notification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Error Notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationTypes.Error
              title="Payment Failed"
              description="Your credit card payment could not be processed. Please check your payment method."
              timestamp="5 minutes ago"
              badge={{ text: "Failed", variant: "destructive" }}
              actions={[
                {
                  label: "Retry Payment",
                  variant: "default",
                  onClick: () => console.log("Retry payment")
                },
                {
                  label: "Update Method",
                  variant: "outline",
                  onClick: () => console.log("Update method")
                }
              ]}
            />
          </CardContent>
        </Card>

        {/* Warning Notification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Warning Notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationTypes.Warning
              title="High Credit Utilization"
              description="Your credit utilization is at 85%. Consider paying down balances to improve your score."
              timestamp="10 minutes ago"
              badge={{ text: "Warning", variant: "secondary" }}
              actions={[
                {
                  label: "View Details",
                  variant: "outline",
                  icon: Eye,
                  onClick: () => console.log("View details")
                }
              ]}
            />
          </CardContent>
        </Card>

        {/* Info Notification */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Info Notification
            </CardTitle>
          </CardHeader>
          <CardContent>
            <NotificationTypes.Info
              title="New Features Available"
              description="Credit monitoring alerts and score tracking are now available in your dashboard."
              timestamp="1 hour ago"
              badge={{ text: "New", variant: "secondary" }}
              actions={[
                {
                  label: "Learn More",
                  variant: "outline",
                  icon: ExternalLink,
                  onClick: () => console.log("Learn more")
                }
              ]}
            />
          </CardContent>
        </Card>
      </div>

      {/* Advanced Notification with Expandable Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-purple-500" />
            Advanced Notification
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Notification
            variant="notification"
            title="Credit Report Analysis Complete"
            description="Your credit report has been analyzed and new insights are available."
            timestamp="2 hours ago"
            badge={{ text: "Analysis", variant: "secondary" }}
            actions={[
              {
                label: "View Insights",
                variant: "default",
                icon: Eye,
                onClick: () => console.log("View insights")
              },
              {
                label: "Download Report",
                variant: "outline",
                icon: Download,
                onClick: () => console.log("Download report")
              }
            ]}
          >
            <div className="space-y-3">
              <h5 className="font-medium text-gray-900 dark:text-gray-100">Analysis Summary</h5>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Payment History:</span>
                  <span className="ml-2 text-green-600">Excellent</span>
                </div>
                <div>
                  <span className="text-gray-500">Credit Utilization:</span>
                  <span className="ml-2 text-yellow-600">Good</span>
                </div>
                <div>
                  <span className="text-gray-500">Credit Mix:</span>
                  <span className="ml-2 text-blue-600">Fair</span>
                </div>
                <div>
                  <span className="text-gray-500">New Credit:</span>
                  <span className="ml-2 text-green-600">Excellent</span>
                </div>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Your credit score is in the good range. Consider these actions to improve it further.
              </p>
            </div>
          </Notification>
        </CardContent>
      </Card>

      {/* Persistent Notifications Container */}
      {showNotifications && (
        <NotificationContainer>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Active Notifications ({notifications.length})
            </h3>
            <Button variant="outline" size="sm" onClick={clearAllNotifications}>
              Clear All
            </Button>
          </div>
          <NotificationGroup
            notifications={notifications}
            onDismiss={dismissNotification}
          />
        </NotificationContainer>
      )}
    </div>
  );
};

export default NotificationDemo; 
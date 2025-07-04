import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { 
  Crown, 
  Shield, 
  Eye, 
  EyeOff, 
  Settings, 
  CreditCard,
  Calendar,
  User,
  Lock,
  Unlock,
  Download,
  Bell
} from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const PremiumSidebar = ({ user }) => {
  const { toast } = useToast();
  const [dataSharing, setDataSharing] = useState(user?.preferences?.dataSharing || false);
  const [showNationalId, setShowNationalId] = useState(false);

  const isPremium = user?.premium?.isPremium;
  const subscriptionType = user?.premium?.subscriptionType || 'yearly';
  const subscriptionEndDate = user?.premium?.subscriptionEndDate;

  const getSubscriptionStatus = () => {
    if (!subscriptionEndDate) return 'active';
    const now = new Date();
    const endDate = new Date(subscriptionEndDate);
    
    if (now > endDate) return 'expired';
    if (now > new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000)) return 'expiring_soon';
    return 'active';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'expired': return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring_soon': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleDataSharingToggle = async () => {
    try {
      // Call API to update data sharing preference
      // await api.put(`/users/${user.id}/preferences`, { dataSharing: !dataSharing });
      
      setDataSharing(!dataSharing);
      toast({
        title: 'Preference Updated',
        description: `Data sharing ${!dataSharing ? 'enabled' : 'disabled'} successfully.`,
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Update Failed',
        description: 'Failed to update data sharing preference.',
        variant: 'destructive',
      });
    }
  };

  const maskNationalId = (nationalId) => {
    if (!nationalId) return '••••-••••-••••';
    return nationalId.replace(/(\d{4})(\d{4})(\d{4})(\d{4})/, '••••-••••-$3-$4');
  };

  const getDaysUntilRenewal = () => {
    if (!subscriptionEndDate) return null;
    const now = new Date();
    const endDate = new Date(subscriptionEndDate);
    const diffTime = endDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen overflow-y-auto">
      <div className="p-6 space-y-6">
        {/* User Profile */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {user?.name || 'User'}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Crown className="h-5 w-5 text-yellow-500" />
              <span>Premium Plan</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Status</span>
              <Badge className={getStatusColor(getSubscriptionStatus())}>
                {getSubscriptionStatus().replace('_', ' ')}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Type</span>
              <span className="text-sm font-medium capitalize">{subscriptionType}</span>
            </div>
            
            {subscriptionEndDate && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Valid Until</span>
                <span className="text-sm font-medium">
                  {new Date(subscriptionEndDate).toLocaleDateString()}
                </span>
              </div>
            )}
            
            {getDaysUntilRenewal() !== null && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Days Left</span>
                <span className={`text-sm font-medium ${
                  getDaysUntilRenewal() <= 7 ? 'text-red-600' : 'text-green-600'
                }`}>
                  {getDaysUntilRenewal()}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* National ID */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Shield className="h-5 w-5 text-blue-500" />
              <span>Identity Verification</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">National ID</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNationalId(!showNationalId)}
                className="h-6 px-2"
              >
                {showNationalId ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </Button>
            </div>
            <div className="font-mono text-sm bg-gray-100 dark:bg-gray-700 p-2 rounded">
              {showNationalId ? user?.nationalId || 'Not provided' : maskNationalId(user?.nationalId)}
            </div>
          </CardContent>
        </Card>

        {/* Data Sharing Consent */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center space-x-2 text-lg">
              {dataSharing ? <Unlock className="h-5 w-5 text-green-500" /> : <Lock className="h-5 w-5 text-gray-500" />}
              <span>Data Sharing</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Allow lenders to access my credit data
              </span>
              <Switch
                checked={dataSharing}
                onCheckedChange={handleDataSharingToggle}
              />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {dataSharing 
                ? 'Lenders can view your credit profile for loan applications.'
                : 'Your credit data is private and not shared with lenders.'
              }
            </p>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Bell className="h-4 w-4 mr-2" />
              Manage Alerts
            </Button>
            <Button variant="outline" className="w-full justify-start" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Account Settings
            </Button>
          </CardContent>
        </Card>

        {/* Premium Features Summary */}
        {isPremium && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Premium Features</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Real-time credit monitoring</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Weekly score updates</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>AI-powered insights</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Priority support</span>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span>Credit simulator</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Separator />

        {/* Footer */}
        <div className="text-center text-xs text-gray-500 dark:text-gray-400">
          <p>Premium Dashboard v1.0</p>
          <p className="mt-1">Secure • Encrypted • Private</p>
        </div>
      </div>
    </div>
  );
};

export default PremiumSidebar; 
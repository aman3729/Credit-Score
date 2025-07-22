import React, { useState } from 'react';
import { 
  Crown, 
  Shield, 
  TrendingUp, 
  AlertTriangle, 
  FileText, 
  Download, 
  Bell, 
  Headphones, 
  BarChart3, 
  Calculator,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  Zap,
  Eye,
  Lock,
  Unlock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Progress } from './ui/progress';

const PremiumFeatures = ({ user, onUpgrade }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const isPremium = user?.premium?.isPremium;
  const subscriptionStatus = user?.premium?.subscriptionStatus || 'none';
  const premiumFeatures = user?.premium?.features || {};

  const featureCategories = {
    creditMonitoring: {
      title: 'Credit Monitoring',
      icon: Eye,
      features: [
        { key: 'realTimeCreditRefresh', label: 'Real-time Credit Refresh', description: 'Weekly updates vs monthly for basic users' },
        { key: 'fullCreditReport', label: 'Full Credit Report', description: 'Complete detailed breakdown of your credit' },
        { key: 'fraudAlerts', label: 'Fraud Alerts', description: 'Instant notifications for suspicious activity' },
        { key: 'creditMonitoring', label: 'Credit Monitoring', description: '24/7 monitoring of your credit profile' }
      ]
    },
    insights: {
      title: 'Personalized Insights',
      icon: TrendingUp,
      features: [
        { key: 'personalizedInsights', label: 'AI-Powered Insights', description: 'Personalized recommendations for improving your score' },
        { key: 'lendingEligibilityReports', label: 'Lending Eligibility', description: 'Detailed reports on loan approval chances' },
        { key: 'customLoanOffers', label: 'Custom Loan Offers', description: 'AI-matched loan offers based on your profile' },
        { key: 'creditSimulator', label: 'Credit Simulator', description: 'See how actions affect your credit score' }
      ]
    },
    support: {
      title: 'Premium Support',
      icon: Headphones,
      features: [
        { key: 'priorityDisputeHandling', label: 'Priority Dispute Handling', description: 'Fast-track credit dispute resolution' },
        { key: 'financialCoaching', label: 'Financial Coaching', description: 'Access to financial advisors and AI coaching' },
        { key: 'prioritySupport', label: 'Priority Support', description: '24/7 chat, phone, and instant messaging support' }
      ]
    },
    tools: {
      title: 'Advanced Tools',
      icon: BarChart3,
      features: [
        { key: 'exportOptions', label: 'Export Options', description: 'PDF, CSV, and email sharing capabilities' },
        { key: 'multiSourceCreditMerge', label: 'Multi-Source Credit Merge', description: 'Pull from multiple credit bureaus' },
        { key: 'customNotifications', label: 'Custom Notifications', description: 'Set alerts for credit changes and opportunities' },
        { key: 'auditLogs', label: 'Audit Logs', description: 'Track who accessed your credit data' },
        { key: 'idVerificationReports', label: 'ID Verification Reports', description: 'Identity verification status tracking' },
        { key: 'complianceCertificates', label: 'Compliance Certificates', description: 'Generate Know Your Score PDFs' }
      ]
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'expired':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'expiring_soon':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Lock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'expired':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const renderFeatureCard = (feature, category) => {
    const isEnabled = premiumFeatures[feature.key];
    const Icon = category.icon;

    return (
      <Card key={feature.key} className={`transition-all duration-200 ${isEnabled ? 'border-green-200 bg-green-50/50' : 'border-gray-200'}`}>
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className={`p-2 rounded-lg ${isEnabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h4 className="font-medium text-sm">{feature.label}</h4>
                {isEnabled ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Lock className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <p className="text-xs text-gray-600">{feature.description}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderSubscriptionInfo = () => {
    if (!isPremium) {
      return (
        <Card className="border-2 border-dashed border-gray-300">
          <CardContent className="p-6 text-center">
            <Crown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Upgrade to Premium</h3>
            <p className="text-gray-600 mb-4">
              Unlock all premium features and get the most out of your credit monitoring experience.
            </p>
            <Button onClick={onUpgrade} className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700">
              <Star className="h-4 w-4 mr-2" />
              Upgrade Now
            </Button>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="border-2 border-green-200 bg-green-50/50">
        <CardContent className="p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Crown className="h-8 w-8 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold">Premium Subscription</h3>
              <Badge className={getStatusColor(subscriptionStatus)}>
                {getStatusIcon(subscriptionStatus)}
                <span className="ml-1 capitalize">{subscriptionStatus.replace('_', ' ')}</span>
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600">Type</p>
              <p className="font-medium">{user.premium.subscriptionType || 'Yearly'}</p>
            </div>
            <div>
              <p className="text-gray-600">Valid Until</p>
              <p className="font-medium">
                {user.premium.subscriptionEndDate ? 
                  new Date(user.premium.subscriptionEndDate).toLocaleDateString() : 
                  'Lifetime'
                }
              </p>
            </div>
          </div>

          {user.premium.usage && (
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Credit Refreshes This Month</span>
                <span className="font-medium">{user.premium.usage.creditRefreshesThisMonth || 0}</span>
              </div>
              <Progress value={Math.min((user.premium.usage.creditRefreshesThisMonth || 0) / 4 * 100, 100)} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Subscription Status */}
      {renderSubscriptionInfo()}

      {/* Feature Categories */}
      <div className="space-y-6">
        {Object.entries(featureCategories).map(([key, category]) => (
          <div key={key}>
            <div className="flex items-center space-x-2 mb-4">
              <category.icon className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold">{category.title}</h3>
              <Badge variant="outline" className="ml-auto">
                {category.features.filter(f => premiumFeatures[f.key]).length}/{category.features.length}
              </Badge>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {category.features.map(feature => renderFeatureCard(feature, category))}
            </div>
          </div>
        ))}
      </div>

      {/* Premium Benefits Summary */}
      {isPremium && (
        <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Zap className="h-5 w-5 text-purple-600" />
              <span>Premium Benefits Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-blue-600">Weekly</div>
                <div className="text-gray-600">Credit Updates</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-green-600">24/7</div>
                <div className="text-gray-600">Monitoring</div>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <div className="text-2xl font-bold text-purple-600">Priority</div>
                <div className="text-gray-600">Support</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default React.memo(PremiumFeatures); 
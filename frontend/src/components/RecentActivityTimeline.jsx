import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { 
  CreditCard, 
  TrendingUp, 
  AlertTriangle, 
  FileText,
  Clock,
  Calendar
} from 'lucide-react';

const RecentActivityTimeline = ({ creditData }) => {
  const getActivityIcon = (source) => {
    switch (source) {
      case 'batch_upload':
        return <FileText className="h-4 w-4" />;
      case 'api':
        return <TrendingUp className="h-4 w-4" />;
      case 'manual':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (source) => {
    switch (source) {
      case 'batch_upload':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'api':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'manual':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = now - date;
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const groupActivities = (activities) => {
    const groups = {
      today: [],
      thisWeek: [],
      pastMonth: []
    };

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    activities.forEach(activity => {
      const activityDate = new Date(activity.date);
      
      if (activityDate.toDateString() === now.toDateString()) {
        groups.today.push(activity);
      } else if (activityDate > oneWeekAgo) {
        groups.thisWeek.push(activity);
      } else if (activityDate > oneMonthAgo) {
        groups.pastMonth.push(activity);
      }
    });

    return groups;
  };

  const activities = creditData?.creditHistory?.map(entry => ({
    id: entry._id || Math.random(),
    type: 'Credit Score Update',
    score: entry.score,
    source: entry.source,
    date: entry.date,
    description: `Credit score updated to ${entry.score}`
  })) || [];

  const groupedActivities = groupActivities(activities);

  const renderActivityGroup = (title, activities, icon) => {
    if (activities.length === 0) return null;

    return (
      <div key={title} className="mb-6">
        <div className="flex items-center space-x-2 mb-3">
          {icon}
          <h3 className="font-semibold text-gray-900 dark:text-white">{title}</h3>
          <Badge variant="outline" className="text-xs">
            {activities.length}
          </Badge>
        </div>
        
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {getActivityIcon(activity.source)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.type}
                  </p>
                  <Badge className={`text-xs ${getActivityColor(activity.source)}`}>
                    {activity.source.replace('_', ' ')}
                  </Badge>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {activity.description}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  {formatDate(activity.date)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Recent Activity</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              Your credit activity will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {renderActivityGroup('Today', groupedActivities.today, <div className="w-2 h-2 bg-green-500 rounded-full" />)}
            {renderActivityGroup('This Week', groupedActivities.thisWeek, <div className="w-2 h-2 bg-blue-500 rounded-full" />)}
            {renderActivityGroup('Past Month', groupedActivities.pastMonth, <div className="w-2 h-2 bg-gray-500 rounded-full" />)}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RecentActivityTimeline; 
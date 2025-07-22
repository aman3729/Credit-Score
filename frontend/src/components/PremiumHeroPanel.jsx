import React from 'react';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const PremiumHeroPanel = ({ user, scoreImprovement, scoreCategory, onRefresh, refreshing }) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getScoreSummary = () => {
    if (scoreImprovement.change === 0) {
      return "Your credit score is stable this week";
    }
    
    const direction = scoreImprovement.trend === 'up' ? 'improved' : 'decreased';
    const points = Math.abs(scoreImprovement.change);
    const timeFrame = 'this week';
    
    return `Your credit score ${direction} by ${points} point${points !== 1 ? 's' : ''} ${timeFrame}!`;
  };

  return (
    <Card className="dark:bg-black text-gray-900 dark:text-white border-0 shadow-lg">
      <CardContent className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
          {/* Left side - Greeting and Score Info */}
          <div className="flex-1">
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                {getGreeting()}, {user?.name?.split(' ')[0] || 'User'} 👋
              </h1>
              <Badge 
                variant="secondary" 
                className="bg-white/20 text-white border-white/30"
              >
                Premium
              </Badge>
            </div>
            
            <p className="text-blue-900 dark:text-blue-100 text-lg mb-3">
              {getScoreSummary()}
            </p>
            
            <div className="flex items-center space-x-4">
              {/* Score Category Badge */}
              <Badge 
                className={`bg-white/20 text-white border-white/30 ${
                  scoreCategory.color === 'green' ? 'bg-green-500/20' :
                  scoreCategory.color === 'blue' ? 'bg-blue-500/20' :
                  scoreCategory.color === 'yellow' ? 'bg-yellow-500/20' :
                  scoreCategory.color === 'orange' ? 'bg-orange-500/20' :
                  scoreCategory.color === 'red' ? 'bg-red-500/20' : 'bg-gray-500/20'
                }`}
              >
                {scoreCategory.emoji} {scoreCategory.category}
              </Badge>
              
              {/* Score Trend */}
              {scoreImprovement.change !== 0 && (
                <div className={`flex items-center space-x-1 ${getTrendColor(scoreImprovement.trend)}`}>
                  {getTrendIcon(scoreImprovement.trend)}
                  <span className="text-sm font-medium">
                    {scoreImprovement.trend === 'up' ? '+' : ''}{scoreImprovement.change} 
                    ({scoreImprovement.percentage > 0 ? '+' : ''}{scoreImprovement.percentage}%)
                  </span>
                </div>
              )}
            </div>
          </div>
          
          {/* Right side - Refresh Button */}
          <div className="flex-shrink-0">
            <Button
              onClick={onRefresh}
              disabled={refreshing}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh Score'}
            </Button>
          </div>
        </div>
        
        {/* Premium Features Highlight */}
        <div className="mt-6 pt-4 border-t border-white/20">
          <div className="flex flex-wrap items-center space-x-4 text-sm text-blue-100">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Real-time monitoring
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Weekly updates
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              AI-powered insights
            </span>
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-2"></span>
              Priority support
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumHeroPanel; 
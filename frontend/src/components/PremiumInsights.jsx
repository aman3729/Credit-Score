import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Brain, 
  TrendingUp, 
  Target, 
  BarChart3,
  Zap,
  Lightbulb
} from 'lucide-react';

const PremiumInsights = ({ creditData, scoreImprovement }) => {
  const currentScore = creditData?.creditScore || creditData?.currentScore || 0;
  const factors = creditData?.creditHistory?.[0]?.factors || {};

  const generateInsights = () => {
    const insights = [];

    // Score trend insight
    if (scoreImprovement.change > 0) {
      insights.push({
        id: 1,
        type: 'positive',
        title: 'Score Momentum',
        description: `Your score has been improving steadily. At this rate, you could reach ${Math.min(850, currentScore + 50)} within 3-6 months.`,
        impact: 'High',
        icon: TrendingUp
      });
    } else if (scoreImprovement.change < 0) {
      insights.push({
        id: 1,
        type: 'warning',
        title: 'Score Decline',
        description: 'Your score has decreased. Focus on payment history and credit utilization to reverse this trend.',
        impact: 'High',
        icon: TrendingUp
      });
    }

    // Payment history insight
    if (factors.paymentHistory < 80) {
      insights.push({
        id: 2,
        type: 'improvement',
        title: 'Payment Optimization',
        description: 'Improving your payment history could add 20-40 points to your score within 6 months.',
        impact: 'High',
        icon: Target
      });
    }

    // Credit utilization insight
    if (factors.creditUtilization > 30) {
      insights.push({
        id: 3,
        type: 'improvement',
        title: 'Utilization Opportunity',
        description: `Reducing utilization from ${factors.creditUtilization}% to 30% could improve your score by 15-25 points.`,
        impact: 'Medium',
        icon: BarChart3
      });
    }

    // Credit age insight
    if (factors.creditAge < 7) {
      insights.push({
        id: 4,
        type: 'info',
        title: 'Credit History Building',
        description: 'Your credit history is relatively young. Keep accounts open to build a stronger foundation.',
        impact: 'Medium',
        icon: Brain
      });
    }

    return insights;
  };

  const getInsightColor = (type) => {
    switch (type) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-red-100 text-red-800 border-red-200';
      case 'improvement': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'info': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High': return 'text-red-600';
      case 'Medium': return 'text-yellow-600';
      case 'Low': return 'text-green-600';
      default: return 'text-gray-600';
    }
  };

  const insights = generateInsights();

  // Calculate projected score
  const calculateProjectedScore = () => {
    let projected = currentScore;
    
    // Add points for good payment history
    if (factors.paymentHistory < 80) {
      projected += Math.min(40, (80 - factors.paymentHistory) * 0.5);
    }
    
    // Add points for reducing utilization
    if (factors.creditUtilization > 30) {
      projected += Math.min(25, (factors.creditUtilization - 30) * 0.5);
    }
    
    // Add points for credit age
    if (factors.creditAge < 7) {
      projected += Math.min(15, (7 - factors.creditAge) * 2);
    }
    
    return Math.min(850, Math.round(projected));
  };

  const projectedScore = calculateProjectedScore();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-500" />
          <span>AI Insights</span>
          <Badge variant="outline" className="text-xs">
            Premium
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <div className="text-center py-8">
            <Lightbulb className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <p className="text-gray-900 dark:text-white font-medium">No insights available</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              More data needed for personalized insights
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => {
              const Icon = insight.icon;
              return (
                <div key={insight.id} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1">
                      <Icon className="h-4 w-4 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-gray-900 dark:text-white">
                          {insight.title}
                        </h3>
                        <Badge className={`text-xs ${getInsightColor(insight.type)}`}>
                          {insight.type}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {insight.description}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-medium ${getImpactColor(insight.impact)}`}>
                          Impact: {insight.impact}
                        </span>
                        <Button size="sm" variant="outline">
                          Learn More
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* Score Projection */}
        <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-2" />
            Score Projection
          </h4>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Current</p>
              <p className="text-lg font-bold text-gray-900 dark:text-white">
                {currentScore}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Projected</p>
              <p className="text-lg font-bold text-blue-600">
                {projectedScore}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Potential</p>
              <p className="text-lg font-bold text-green-600">
                +{projectedScore - currentScore}
              </p>
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Projection based on current credit factors and improvement opportunities
          </div>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-4 space-y-2">
          <Button variant="outline" size="sm" className="w-full">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Detailed Analysis
          </Button>
          <Button variant="outline" size="sm" className="w-full">
            <Target className="h-4 w-4 mr-2" />
            Set Score Goals
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumInsights; 
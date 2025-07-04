import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { 
  CreditCard, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Info
} from 'lucide-react';

const CreditScoreDial = ({ creditData, scoreCategory }) => {
  const [selectedFactor, setSelectedFactor] = useState(null);

  const currentScore = creditData?.creditScore || creditData?.currentScore || 0;
  
  // Calculate score percentage for dial (300-850 range)
  const scorePercentage = Math.max(0, Math.min(100, ((currentScore - 300) / (850 - 300)) * 100));
  
  // Calculate the angle for the circular progress (0-360 degrees)
  const progressAngle = (scorePercentage / 100) * 360;
  
  // Get credit factors from real data
  const getCreditFactors = () => {
    const factors = creditData?.creditHistory?.[0]?.factors || {};
    
    return [
      {
        name: 'Payment History',
        value: factors.paymentHistory || 0,
        weight: 35,
        icon: CheckCircle,
        description: 'Your payment history shows how consistently you pay your bills on time.',
        color: factors.paymentHistory >= 80 ? 'green' : factors.paymentHistory >= 60 ? 'yellow' : 'red'
      },
      {
        name: 'Credit Utilization',
        value: factors.creditUtilization || 0,
        weight: 30,
        icon: CreditCard,
        description: 'The percentage of your available credit that you\'re currently using.',
        color: factors.creditUtilization <= 30 ? 'green' : factors.creditUtilization <= 50 ? 'yellow' : 'red'
      },
      {
        name: 'Credit Age',
        value: factors.creditAge || 0,
        weight: 15,
        icon: Clock,
        description: 'The average age of your credit accounts and how long you\'ve had credit.',
        color: factors.creditAge >= 7 ? 'green' : factors.creditAge >= 3 ? 'yellow' : 'red'
      },
      {
        name: 'Credit Mix',
        value: factors.creditMix || 0,
        weight: 10,
        icon: TrendingUp,
        description: 'The variety of credit types you have (credit cards, loans, mortgages).',
        color: factors.creditMix >= 3 ? 'green' : factors.creditMix >= 2 ? 'yellow' : 'red'
      },
      {
        name: 'Inquiries',
        value: factors.inquiries || 0,
        weight: 10,
        icon: AlertTriangle,
        description: 'Recent credit applications and hard inquiries on your report.',
        color: factors.inquiries <= 2 ? 'green' : factors.inquiries <= 5 ? 'yellow' : 'red'
      }
    ];
  };

  const getFactorColor = (color) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getFactorTextColor = (color) => {
    switch (color) {
      case 'green': return 'text-green-600';
      case 'yellow': return 'text-yellow-600';
      case 'red': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getScoreColor = () => {
    if (currentScore >= 800) return '#10b981'; // green
    if (currentScore >= 740) return '#3b82f6'; // blue
    if (currentScore >= 670) return '#f59e0b'; // yellow
    if (currentScore >= 580) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  const creditFactors = getCreditFactors();

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Credit Score Breakdown</span>
          <Badge variant="outline" className="text-sm">
            {scoreCategory.emoji} {scoreCategory.category}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Score Dial */}
        <div className="flex justify-center">
          <div className="relative">
            {/* Circular Progress */}
            <div className="w-48 h-48 rounded-full border-8 border-gray-200 flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                {/* Progress circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={getScoreColor()}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 42}`}
                  strokeDashoffset={`${2 * Math.PI * 42 * (1 - scorePercentage / 100)}`}
                  style={{
                    transition: 'stroke-dashoffset 0.5s ease-in-out'
                  }}
                />
              </svg>
              <div className="text-center relative z-10">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {currentScore}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  out of 850
                </div>
              </div>
            </div>
            
            {/* Score Range Labels */}
            <div className="absolute -top-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
              850
            </div>
            <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
              300
            </div>
          </div>
        </div>

        {/* Credit Factors */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Credit Factors</h3>
          {creditFactors.map((factor, index) => {
            const Icon = factor.icon;
            return (
              <TooltipProvider key={factor.name}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className="cursor-pointer"
                      onClick={() => setSelectedFactor(selectedFactor === factor.name ? null : factor.name)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <Icon className={`h-4 w-4 ${getFactorTextColor(factor.color)}`} />
                          <span className="font-medium">{factor.name}</span>
                          <span className="text-sm text-gray-500">({factor.weight}%)</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm font-medium ${getFactorTextColor(factor.color)}`}>
                            {factor.value}
                          </span>
                          <div className={`w-3 h-3 rounded-full ${getFactorColor(factor.color)}`} />
                        </div>
                      </div>
                      <Progress 
                        value={factor.value} 
                        className="h-2"
                        style={{
                          '--progress-color': factor.color === 'green' ? '#10b981' : 
                            factor.color === 'yellow' ? '#f59e0b' : 
                            factor.color === 'red' ? '#ef4444' : '#6b7280'
                        }}
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{factor.description}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Impact: {factor.weight}% of your total score
                    </p>
                  </TooltipContent>
                </Tooltip>
                
                {/* Expanded Factor Details */}
                {selectedFactor === factor.name && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div className="flex items-start space-x-2">
                      <Info className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div className="text-sm">
                        <p className="font-medium mb-1">{factor.name} Details</p>
                        <p className="text-gray-600 dark:text-gray-400 mb-2">{factor.description}</p>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-gray-500">Current Value:</span>
                            <span className="ml-1 font-medium">{factor.value}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Weight:</span>
                            <span className="ml-1 font-medium">{factor.weight}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </TooltipProvider>
            );
          })}
        </div>

        {/* Score Insights */}
        {creditData?.creditHistory && creditData.creditHistory.length > 0 && (
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
              Score Insights
            </h4>
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p>Your score is based on {creditData.creditHistory.length} credit check{creditData.creditHistory.length !== 1 ? 's' : ''}.</p>
              <p className="mt-1">
                Last updated: {new Date(creditData.creditHistory[0]?.date || Date.now()).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CreditScoreDial; 
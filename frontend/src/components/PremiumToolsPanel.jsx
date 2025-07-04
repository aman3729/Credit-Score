import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Calculator, 
  TrendingUp, 
  Download, 
  Share2,
  Zap,
  Target
} from 'lucide-react';

const PremiumToolsPanel = ({ user, creditData }) => {
  const tools = [
    {
      name: 'Credit Simulator',
      description: 'See how actions affect your score',
      icon: Calculator,
      color: 'bg-blue-500',
      available: true
    },
    {
      name: 'Score Projection',
      description: 'Predict your future credit score',
      icon: TrendingUp,
      color: 'bg-green-500',
      available: true
    },
    {
      name: 'Report Download',
      description: 'Get your full credit report',
      icon: Download,
      color: 'bg-purple-500',
      available: true
    },
    {
      name: 'Lender Sharing',
      description: 'Share with approved lenders',
      icon: Share2,
      color: 'bg-orange-500',
      available: user?.preferences?.dataSharing || false
    }
  ];

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          <span>Premium Tools</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.name} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${tool.color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-gray-900 dark:text-white">
                      {tool.name}
                    </h3>
                    {tool.available ? (
                      <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                        Available
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 border-gray-200 text-xs">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {tool.description}
                  </p>
                  <Button 
                    size="sm" 
                    disabled={!tool.available}
                    className="w-full"
                  >
                    {tool.available ? 'Use Tool' : 'Enable First'}
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Quick Stats */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
            <Target className="h-4 w-4 mr-2" />
            Quick Stats
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 dark:text-gray-400">Score Range</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {creditData?.creditScore || 0} / 850
              </p>
            </div>
            <div>
              <p className="text-gray-600 dark:text-gray-400">Updates</p>
              <p className="font-medium text-gray-900 dark:text-white">
                {creditData?.creditHistory?.length || 0} times
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default PremiumToolsPanel; 
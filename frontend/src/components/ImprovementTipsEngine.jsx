import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  Target, 
  Clock, 
  Zap, 
  AlertTriangle, 
  CheckCircle, 
  Lightbulb,
  Calendar,
  DollarSign,
  CreditCard
} from 'lucide-react';
import { api } from '../lib/api';

const ImprovementTipsEngine = ({ userData, scoreResult }) => {
  const [suggestions, setSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('priority');

  useEffect(() => {
    if (userData && scoreResult) {
      generateSuggestions();
    }
  }, [userData, scoreResult]);

  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/v1/credit-scores/improvement-suggestions', {
        userData,
        scoreResult
      });
      setSuggestions(response.data.data);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      generateFallbackSuggestions();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackSuggestions = () => {
    const { score, breakdown } = scoreResult || {};
    const priority = [];
    const suggestions = [];

    // High priority suggestions based on score and breakdown
    if (score < 600) {
      priority.push({
        action: 'Address Credit Issues',
        impact: 'High',
        timeframe: '6-12 months',
        description: 'Focus on resolving any collections, defaults, or serious delinquencies',
        icon: 'AlertTriangle',
        category: 'credit-repair'
      });
    }

    if (breakdown?.paymentHistory < 20) {
      priority.push({
        action: 'Fix Payment History',
        impact: 'High',
        timeframe: '6-12 months',
        description: 'Make all payments on time to improve this critical factor',
        icon: 'Calendar',
        category: 'payments'
      });
    }

    if (breakdown?.creditUtilization > 70) {
      priority.push({
        action: 'Reduce Credit Utilization',
        impact: 'High',
        timeframe: '1-3 months',
        description: 'Pay down credit card balances to below 30%',
        icon: 'CreditCard',
        category: 'utilization'
      });
    }

    // Medium priority suggestions
    if (breakdown?.creditAge < 5) {
      suggestions.push({
        action: 'Build Credit Age',
        impact: 'Medium',
        timeframe: 'Long-term',
        description: 'Keep old accounts open to lengthen credit history',
        icon: 'Clock',
        category: 'credit-age'
      });
    }

    if (breakdown?.creditMix < 5) {
      suggestions.push({
        action: 'Diversify Credit Mix',
        impact: 'Medium',
        timeframe: '6-12 months',
        description: 'Consider adding different types of credit',
        icon: 'Target',
        category: 'credit-mix'
      });
    }

    setSuggestions({ priority, suggestions });
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'High':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'Medium':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'Low':
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getTimeframeColor = (timeframe) => {
    switch (timeframe) {
      case '1-3 months':
        return 'text-green-600';
      case '3-6 months':
        return 'text-yellow-600';
      case '6-12 months':
        return 'text-orange-600';
      case 'Long-term':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  const getIcon = (iconName) => {
    switch (iconName) {
      case 'AlertTriangle':
        return <AlertTriangle className="h-4 w-4" />;
      case 'Calendar':
        return <Calendar className="h-4 w-4" />;
      case 'CreditCard':
        return <CreditCard className="h-4 w-4" />;
      case 'Clock':
        return <Clock className="h-4 w-4" />;
      case 'Target':
        return <Target className="h-4 w-4" />;
      case 'TrendingUp':
        return <TrendingUp className="h-4 w-4" />;
      case 'Zap':
        return <Zap className="h-4 w-4" />;
      default:
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  const renderSuggestionCard = (suggestion, index) => (
    <Card key={index} className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
            {getIcon(suggestion.icon)}
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-gray-900 dark:text-white">
                {suggestion.action}
              </h3>
              <Badge className={`text-xs ${getImpactColor(suggestion.impact)}`}>
                {suggestion.impact} Impact
              </Badge>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {suggestion.description}
            </p>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${getTimeframeColor(suggestion.timeframe)}`}>
                <Clock className="h-3 w-3 inline mr-1" />
                {suggestion.timeframe}
              </span>
              <Button variant="outline" size="sm">
                <Target className="h-3 w-3 mr-1" />
                Set Goal
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Card className="bg-white dark:bg-[#1a243a] shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>Improvement Tips</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-3">
                <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) {
    return null;
  }

  return (
    <Card className="bg-white dark:bg-[#1a243a] shadow">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <span>Improvement Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Category Tabs */}
        <div className="flex space-x-2">
          <Button
            variant={selectedCategory === 'priority' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('priority')}
          >
            <AlertTriangle className="h-3 w-3 mr-1" />
            High Priority ({suggestions.priority?.length || 0})
          </Button>
          <Button
            variant={selectedCategory === 'suggestions' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedCategory('suggestions')}
          >
            <Target className="h-3 w-3 mr-1" />
            All Tips ({suggestions.suggestions?.length || 0})
          </Button>
        </div>

        {/* Priority Suggestions */}
        {selectedCategory === 'priority' && suggestions.priority && suggestions.priority.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-red-500" />
              High Priority Actions
            </h3>
            <div className="space-y-3">
              {suggestions.priority.map((suggestion, index) => renderSuggestionCard(suggestion, index))}
            </div>
          </div>
        )}

        {/* All Suggestions */}
        {selectedCategory === 'suggestions' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-500" />
              All Improvement Tips
            </h3>
            <div className="space-y-3">
              {suggestions.priority && suggestions.priority.map((suggestion, index) => 
                renderSuggestionCard(suggestion, `priority-${index}`)
              )}
              {suggestions.suggestions && suggestions.suggestions.map((suggestion, index) => 
                renderSuggestionCard(suggestion, `suggestion-${index}`)
              )}
            </div>
          </div>
        )}

        {/* No Suggestions */}
        {selectedCategory === 'priority' && (!suggestions.priority || suggestions.priority.length === 0) && (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Great Job!
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              No high priority actions needed. Keep up the good work!
            </p>
          </div>
        )}

        {/* Quick Actions */}
        <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
          <h3 className="font-medium text-gray-700 dark:text-white mb-3 flex items-center">
            <Zap className="h-4 w-4 mr-2 text-purple-500" />
            Quick Actions
          </h3>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="h-3 w-3 mr-1" />
              Set Payment Reminders
            </Button>
            <Button variant="outline" size="sm">
              <Target className="h-3 w-3 mr-1" />
              Create Goals
            </Button>
            <Button variant="outline" size="sm">
              <TrendingUp className="h-3 w-3 mr-1" />
              Track Progress
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(ImprovementTipsEngine); 
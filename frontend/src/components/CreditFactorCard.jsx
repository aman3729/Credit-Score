import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Button } from './ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Target,
  Lightbulb
} from 'lucide-react';
import { api } from '../lib/api';

const CreditFactorCard = ({ factor, score, breakdown }) => {
  const [reasoning, setReasoning] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (breakdown) {
      generateFactorReasoning();
    }
  }, [breakdown, factor]);

  const generateFactorReasoning = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/v1/credit-scores/breakdown-reasoning', {
        breakdown: { [factor.key]: breakdown[factor.key] }
      });
      
      if (response.data.data && response.data.data[factor.key]) {
        setReasoning(response.data.data[factor.key]);
      }
    } catch (error) {
      console.error('Error generating factor reasoning:', error);
      // Fallback reasoning
      generateFallbackReasoning();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackReasoning = () => {
    const factorValue = breakdown[factor.key];
    let status = 'good';
    let message = 'This factor is helping your score.';
    let action = 'Maintain current behavior.';

    if (factor.key === 'paymentHistory') {
      if (factorValue < 20) {
        status = 'critical';
        message = 'Payment history is severely impacting your score.';
        action = 'Focus on making all payments on time.';
      } else if (factorValue < 40) {
        status = 'warning';
        message = 'Payment history needs improvement.';
        action = 'Continue making timely payments.';
      }
    } else if (factor.key === 'creditUtilization') {
      if (factorValue > 70) {
        status = 'critical';
        message = 'Very high credit utilization.';
        action = 'Pay down balances immediately.';
      } else if (factorValue > 50) {
        status = 'warning';
        message = 'High credit utilization.';
        action = 'Reduce utilization below 30%.';
      }
    } else if (factor.key === 'creditAge') {
      if (factorValue < 5) {
        status = 'warning';
        message = 'Short credit history.';
        action = 'Keep old accounts open.';
      }
    } else if (factor.key === 'creditMix') {
      if (factorValue < 5) {
        status = 'warning';
        message = 'Limited credit mix.';
        action = 'Consider diversifying credit types.';
      }
    } else if (factor.key === 'inquiries') {
      if (factorValue > 5) {
        status = 'warning';
        message = 'Too many recent inquiries.';
        action = 'Avoid new credit applications.';
      }
    }

    setReasoning({ status, message, action });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'critical':
        return 'text-red-600 bg-red-100 border-red-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'good':
        return 'text-green-600 bg-green-100 border-green-200';
      default:
        return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4" />;
      case 'warning':
        return <TrendingDown className="h-4 w-4" />;
      case 'good':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  const getProgressColor = (value, factorKey) => {
    if (factorKey === 'paymentHistory') {
      return value >= 40 ? 'bg-green-500' : value >= 20 ? 'bg-yellow-500' : 'bg-red-500';
    } else if (factorKey === 'creditUtilization') {
      return value <= 30 ? 'bg-green-500' : value <= 50 ? 'bg-yellow-500' : 'bg-red-500';
    } else if (factorKey === 'creditAge') {
      return value >= 10 ? 'bg-green-500' : value >= 5 ? 'bg-yellow-500' : 'bg-red-500';
    } else if (factorKey === 'creditMix') {
      return value >= 5 ? 'bg-green-500' : 'bg-yellow-500';
    } else if (factorKey === 'inquiries') {
      return value <= 2 ? 'bg-green-500' : value <= 5 ? 'bg-yellow-500' : 'bg-red-500';
    }
    return 'bg-blue-500';
  };

  const factorValue = breakdown ? breakdown[factor.key] : factor.score;
  const progressValue = factor.key === 'creditUtilization' ? 
    Math.min(factorValue * 100, 100) : 
    Math.min(factorValue * 2, 100);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {factor.name}
          </CardTitle>
          {reasoning && (
            <Badge className={`text-xs ${getStatusColor(reasoning.status)}`}>
              {getStatusIcon(reasoning.status)}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-600 dark:text-gray-400">Impact</span>
            <span className="font-medium text-gray-900 dark:text-white">
              {factorValue ? factorValue.toFixed(1) : factor.score}
            </span>
          </div>
          <Progress 
            value={progressValue} 
            className="h-2"
            style={{
              '--progress-color': getProgressColor(factorValue, factor.key)
            }}
          />
        </div>

        {/* Reasoning Section */}
        {reasoning && !loading && (
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="flex items-start space-x-2">
              <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="space-y-2">
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {reasoning.message}
                </p>
                <div className="flex items-center space-x-2">
                  <Target className="h-3 w-3 text-blue-500" />
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium">
                    {reasoning.action}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
          </div>
        )}

        {/* Factor Details */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          <div className="flex justify-between">
            <span>Weight:</span>
            <span>{factor.weight}%</span>
          </div>
          <div className="flex justify-between">
            <span>Status:</span>
            <span className={`capitalize ${
              reasoning?.status === 'critical' ? 'text-red-600' :
              reasoning?.status === 'warning' ? 'text-yellow-600' :
              reasoning?.status === 'good' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {reasoning?.status || 'neutral'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CreditFactorCard;

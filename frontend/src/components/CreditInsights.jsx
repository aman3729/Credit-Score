import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { 
  Lightbulb, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle, 
  Info,
  Target,
  Clock,
  Zap
} from 'lucide-react';

const CreditInsights = ({ userData, scoreResult, lendingDecision }) => {
  const { user } = useAuth();
  const [reasoning, setReasoning] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (userData && scoreResult && lendingDecision) {
      generateReasoning();
    }
  }, [userData, scoreResult, lendingDecision]);

  const generateReasoning = async () => {
    setLoading(true);
    try {
      const response = await api.post('/api/credit/reasoning', {
        userData,
        scoreResult,
        lendingDecision
      });
      setReasoning(response.data);
    } catch (error) {
      console.error('Error generating reasoning:', error);
      // Fallback to client-side reasoning if API fails
      generateFallbackReasoning();
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackReasoning = () => {
    if (!userData || !scoreResult) return;

    const { score, classification, breakdown } = scoreResult;
    const reasons = [];
    const actions = [];
    const insights = [];

    // Basic score analysis
    reasons.push(`Your credit score is ${score} (${classification}).`);
    
    if (score >= 740) {
      insights.push("Excellent credit standing - you qualify for the best rates and terms.");
      actions.push("Maintain low credit utilization (under 30%) and continue timely payments.");
    } else if (score >= 670) {
      insights.push("Good credit standing - you qualify for most loans with competitive rates.");
      actions.push("Slight improvements in payment history or utilization can help you reach the 'Very Good' range.");
    } else if (score >= 580) {
      insights.push("Fair credit standing - you may qualify for loans but with higher rates.");
      actions.push("Focus on reducing debt and avoiding missed payments.");
    } else {
      insights.push("Poor credit standing - focus on rebuilding your credit profile.");
      actions.push("Address any outstanding collections or defaults.");
    }

    // Basic breakdown analysis
    if (breakdown?.paymentHistory < 20) {
      reasons.push("Payment history is significantly hurting your score.");
      actions.push("Set up automatic payments to avoid future late payments.");
    }

    if (breakdown?.creditUtilization > 70) {
      reasons.push("Very high credit utilization is severely impacting your score.");
      actions.push("Pay down credit card balances to reduce utilization below 30%.");
    }

    setReasoning({
      summary: reasons,
      recommendations: actions,
      insights: insights
    });
  };

  if (loading) {
    return (
      <Card className="bg-white dark:bg-[#1a243a] shadow">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <span>Credit Insights</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!reasoning) {
    return null;
  }

  return (
    <Card className="bg-white dark:bg-[#1a243a] shadow">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <span>Credit Insights</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Insights */}
        {reasoning.insights && reasoning.insights.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-700 dark:text-white mb-3 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
              Positive Factors
            </h3>
            <ul className="space-y-2">
              {reasoning.insights.map((insight, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Issues to Address */}
        {reasoning.summary && reasoning.summary.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-700 dark:text-white mb-3 flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2 text-orange-500" />
              Areas for Improvement
            </h3>
            <ul className="space-y-2">
              {reasoning.summary.map((reason, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  {reason}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Actionable Recommendations */}
        {reasoning.recommendations && reasoning.recommendations.length > 0 && (
          <div>
            <h3 className="font-medium text-gray-700 dark:text-white mb-3 flex items-center">
              <Target className="h-4 w-4 mr-2 text-blue-500" />
              Recommended Actions
            </h3>
            <ul className="space-y-2">
              {reasoning.recommendations.map((recommendation, index) => (
                <li key={index} className="text-sm text-gray-600 dark:text-gray-300 flex items-start">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></div>
                  {recommendation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Metrics Summary */}
        {reasoning.metrics && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="font-medium text-gray-700 dark:text-white mb-3 flex items-center">
              <Info className="h-4 w-4 mr-2 text-gray-500" />
              Key Metrics
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {reasoning.metrics.score && (
                <div>
                  <span className="text-xs text-gray-500">Credit Score</span>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {reasoning.metrics.score}
                  </div>
                </div>
              )}
              {reasoning.metrics.dtiRatio && (
                <div>
                  <span className="text-xs text-gray-500">DTI Ratio</span>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {reasoning.metrics.dtiRatio}%
                  </div>
                </div>
              )}
              {reasoning.metrics.creditUtilization && (
                <div>
                  <span className="text-xs text-gray-500">Credit Utilization</span>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {reasoning.metrics.creditUtilization}%
                  </div>
                </div>
              )}
              {reasoning.metrics.creditAge && (
                <div>
                  <span className="text-xs text-gray-500">Credit Age</span>
                  <div className="font-semibold text-gray-900 dark:text-white">
                    {reasoning.metrics.creditAge} years
                  </div>
                </div>
              )}
            </div>
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
              <TrendingUp className="h-3 w-3 mr-1" />
              View Score History
            </Button>
            <Button variant="outline" size="sm">
              <Target className="h-3 w-3 mr-1" />
              Set Goals
            </Button>
            <Button variant="outline" size="sm">
              <Clock className="h-3 w-3 mr-1" />
              Payment Reminders
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default React.memo(CreditInsights); 
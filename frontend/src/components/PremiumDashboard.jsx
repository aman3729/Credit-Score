import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/use-toast';
import { api } from '../lib/api';
import PremiumSidebar from './PremiumSidebar';
import PremiumTopbar from './PremiumTopbar';
import PremiumHeroPanel from './PremiumHeroPanel';
import CreditScoreDial from './CreditScoreDial';
import RecentActivityTimeline from './RecentActivityTimeline';
import PremiumToolsPanel from './PremiumToolsPanel';
import ImprovementTipsEngine from './ImprovementTipsEngine';
import PremiumAlerts from './PremiumAlerts';
import PremiumInsights from './PremiumInsights';
import CreditInsights from './CreditInsights';
import { Card, CardContent } from './ui/card';
import { Loader2 } from 'lucide-react';

const PremiumDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // State for real user data
  const [userData, setUserData] = useState(null);
  const [creditData, setCreditData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  // Fetch user's credit data
  const fetchUserData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch user's credit data
      const response = await api.get(`/users/${user.id}/credit-data`);
      const data = response.data.data || response.data;
      
      // Transform the data to match our component expectations
      const transformedData = {
        ...data,
        creditScore: data.currentScore,
        currentScore: data.currentScore,
        creditHistory: data.creditScores?.map(score => ({
          score: score.score,
          date: score.date,
          source: 'api',
          factors: score.factors || {}
        })) || []
      };
      
      setCreditData(transformedData);
      setUserData(user);
      
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to load your credit data');
      toast({
        title: 'Error',
        description: 'Failed to load your credit data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Refresh credit score (premium feature)
  const handleRefreshScore = async () => {
    if (!user?.premium?.isPremium) {
      toast({
        title: 'Premium Feature',
        description: 'Real-time credit refresh is a premium feature.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setRefreshing(true);
      
      // Call backend to refresh credit score
      const response = await api.post(`/users/${user.id}/refresh-credit-score`);
      
      // Update local data
      setCreditData(prev => ({
        ...prev,
        ...response.data.data
      }));
      
      toast({
        title: 'Score Refreshed',
        description: 'Your credit score has been updated successfully!',
        variant: 'default',
      });
      
    } catch (err) {
      console.error('Error refreshing score:', err);
      toast({
        title: 'Refresh Failed',
        description: 'Unable to refresh your credit score. Please try again later.',
        variant: 'destructive',
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Calculate score improvement
  const getScoreImprovement = () => {
    if (!creditData?.creditHistory || creditData.creditHistory.length < 2) {
      return { change: 0, percentage: 0, trend: 'neutral' };
    }

    const currentScore = creditData.creditScore || creditData.currentScore;
    const previousScore = creditData.creditHistory[1]?.score;
    
    if (!currentScore || !previousScore) {
      return { change: 0, percentage: 0, trend: 'neutral' };
    }

    const change = currentScore - previousScore;
    const percentage = Math.round((change / previousScore) * 100);
    
    return {
      change,
      percentage,
      trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral'
    };
  };

  // Get score category and color
  const getScoreCategory = (score) => {
    if (!score) return { category: 'Unknown', color: 'gray', emoji: '❓' };
    
    if (score >= 800) return { category: 'Excellent', color: 'green', emoji: '🟢' };
    if (score >= 740) return { category: 'Very Good', color: 'blue', emoji: '🔵' };
    if (score >= 670) return { category: 'Good', color: 'yellow', emoji: '🟡' };
    if (score >= 580) return { category: 'Fair', color: 'orange', emoji: '🟠' };
    return { category: 'Poor', color: 'red', emoji: '🔴' };
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600 dark:text-gray-400">Loading your premium dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-600 mb-4">{error}</p>
            <button 
              onClick={fetchUserData}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Try Again
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const scoreImprovement = getScoreImprovement();
  const scoreCategory = getScoreCategory(creditData?.creditScore || creditData?.currentScore);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <PremiumSidebar user={userData} />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Topbar */}
          <PremiumTopbar user={userData} />
          
          {/* Main Dashboard Content */}
          <main className="flex-1 p-6 space-y-6">
            {/* Hero Panel */}
            <PremiumHeroPanel 
              user={userData}
              scoreImprovement={scoreImprovement}
              scoreCategory={scoreCategory}
              onRefresh={handleRefreshScore}
              refreshing={refreshing}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Credit Score Dial */}
              <div className="lg:col-span-2">
                <CreditScoreDial 
                  creditData={creditData}
                  scoreCategory={scoreCategory}
                />
              </div>
              
              {/* Premium Tools Panel */}
              <div className="lg:col-span-1">
                <PremiumToolsPanel 
                  user={userData}
                  creditData={creditData}
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Activity Timeline */}
              <RecentActivityTimeline creditData={creditData} />
              
              {/* Improvement Tips Engine */}
              <ImprovementTipsEngine 
                creditData={creditData}
                scoreCategory={scoreCategory}
              />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Alerts & Notifications */}
              <PremiumAlerts user={userData} />
              
              {/* Insights & Projections */}
              <PremiumInsights 
                creditData={creditData}
                scoreImprovement={scoreImprovement}
              />
            </div>
            
            {/* Credit Insights */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Advanced Credit Analysis</h2>
              <CreditInsights 
                creditData={creditData}
                scoreCategory={scoreCategory}
              />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default PremiumDashboard; 
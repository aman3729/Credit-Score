import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

// Import components
import DashboardLayout from './layout/DashboardLayout';
import CreditScoreDisplay from './CreditScoreDisplay';
import CreditFactorCard from './CreditFactorCard';
import ScoreHistoryChart from './ScoreHistoryChart';
import RecentActivity from './RecentActivity';
import CreditHealthSummary from './CreditHealthSummary';

// Import icons
import { FiCreditCard, FiTrendingUp, FiAlertCircle, FiShield, FiClock, FiStar, 
         FiRefreshCw, FiBarChart2, FiDollarSign, FiLock, FiCheckCircle, 
         FiUser, FiSettings, FiLogOut, FiChevronDown, FiHelpCircle } from 'react-icons/fi';

export const Dashboard = ({ onLogout }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [creditData, setCreditData] = useState({
    score: 0,
    history: [],
    factors: {
      paymentHistory: 0,
      creditUtilization: 0,
      creditAge: 0,
      totalAccounts: 0,
      creditInquiries: 0,
    },
  });

  // Mock data for the dashboard
  const mockScoreHistory = useMemo(() => [
    { month: 'Jan', score: 650 },
    { month: 'Feb', score: 665 },
    { month: 'Mar', score: 680 },
    { month: 'Apr', score: 690 },
    { month: 'May', score: 710 },
    { month: 'Jun', score: 720 },
    { month: 'Jul', score: 730 },
    { month: 'Aug', score: 735 },
    { month: 'Sep', score: 740 },
    { month: 'Oct', score: 745 },
    { month: 'Nov', score: 750 },
    { month: 'Dec', score: 755 },
  ], []);

  const recentActivity = useMemo(() => [
    { id: 1, action: 'Credit score updated', date: '2 hours ago', change: '+5', icon: <FiTrendingUp className="text-green-500" />, positive: true },
    { id: 2, action: 'Viewed credit report', date: '1 day ago', icon: <FiClock className="text-blue-500" /> },
    { id: 3, action: 'New credit inquiry', date: '3 days ago', change: '-2', icon: <FiAlertCircle className="text-yellow-500" />, negative: true },
  ], []);

  const creditHealthTips = useMemo(() => [
    { 
      id: 1, 
      title: 'Reduce Credit Utilization', 
      description: 'Keep your credit card balances below 30% of your limit to improve your score',
      icon: <FiCreditCard className="text-indigo-500 text-xl" />,
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20'
    },
    { 
      id: 2, 
      title: 'Diversify Your Credit', 
      description: 'Consider adding different types of credit (installment, revolving)',
      icon: <FiShield className="text-green-500 text-xl" />,
      bgColor: 'bg-green-50 dark:bg-green-900/20'
    },
    { 
      id: 3, 
      title: 'Monitor Regularly', 
      description: 'Check your credit report monthly to catch errors early',
      icon: <FiClock className="text-blue-500 text-xl" />,
      bgColor: 'bg-blue-50 dark:bg-blue-900/20'
    }
  ], []);

  const premiumFeatures = useMemo(() => [
    { id: 1, feature: 'Advanced Credit Monitoring', icon: <FiBarChart2 /> },
    { id: 2, feature: 'Identity Theft Protection', icon: <FiLock /> },
    { id: 3, feature: 'Credit Score Simulator', icon: <FiDollarSign /> },
    { id: 4, feature: '24/7 Support', icon: <FiCheckCircle /> },
  ], []);

  const fetchCreditData = useCallback(async () => {
    try {
      const userId = user?._id || user?.id;
      if (!userId) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      setIsRefreshing(true);
      
      let creditScore = 0;
      let history = [];
      let factors = {
        paymentHistory: 0,
        creditUtilization: 0,
        creditAge: 0,
        totalAccounts: 0,
        creditInquiries: 0
      };

      // Try to fetch credit data from the credit-data endpoint first
      try {
        const response = await api.get(`/users/${userId}/credit-data`);
        console.log('Credit data response:', response.data);
        
        if (response.data) {
          const responseData = response.data.data || response.data;
          
          // Extract credit score
          creditScore = responseData.creditScore?.score || 
                       responseData.score || 
                       (responseData.creditScores?.[0]?.score) || 
                       0;
          
          // Extract history
          if (responseData.creditScores?.length) {
            history = responseData.creditScores
              .sort((a, b) => new Date(a.reportDate || a.date) - new Date(b.reportDate || b.date))
              .map(item => ({
                date: new Date(item.reportDate || item.date).toISOString().split('T')[0],
                score: item.score || 0
              }));
          }
          
          // Extract factors
          if (responseData.factors?.length) {
            responseData.factors.forEach(factor => {
              if (factor.name && factor.value !== undefined) {
                const factorName = factor.name.toLowerCase().replace(/\s+/g, '');
                factors[factorName] = factor.value;
              }
            });
          } else if (responseData.creditScore?.factors) {
            factors = { ...factors, ...responseData.creditScore.factors };
          }
        }
      } catch (error) {
        console.error('Error fetching credit data:', error);
        if (error.response?.status !== 404) {
          setError('Failed to load credit data. Please try again later.');
        }
      }
      
      // Fallback to user profile if needed
      if ((!creditScore && creditScore !== 0) || history.length === 0) {
        try {
          const userResponse = await api.get(`/users/${userId}`);
          const userData = userResponse.data.data || userResponse.data;
          
          if (userData.creditScore || userData.creditScore === 0) {
            if (!creditScore && creditScore !== 0) {
              creditScore = userData.creditScore;
            }
            
            if (history.length === 0) {
              history = [{
                date: new Date().toISOString().split('T')[0],
                score: userData.creditScore || 0,
                change: 0
              }];
            }
            
            if (Object.values(factors).every(val => val === 0) && userData.creditFactors) {
              factors = { ...factors, ...userData.creditFactors };
            }
          }
        } catch (profileError) {
          console.error('Error fetching user profile:', profileError);
          if (history.length === 0 && !creditScore) {
            setError('Failed to load user profile data.');
          }
        }
      }
      
      // Apply defaults if still no data
      if ((!creditScore && creditScore !== 0) || history.length === 0) {
        creditScore = creditScore || 700;
        history = [{
          date: new Date().toISOString().split('T')[0],
          score: creditScore,
          change: 0
        }];
      }
      
      // Ensure we have at least one history entry
      if (history.length === 0) {
        history = [{
          date: new Date().toISOString().split('T')[0],
          score: creditScore,
          change: 0
        }];
      }
      
      // Ensure we have a valid credit score
      if ((!creditScore && creditScore !== 0) || isNaN(creditScore)) {
        creditScore = 700;
      }
      
      // Update state with the final data
      setCreditData({
        score: creditScore,
        history: history,
        factors: {
          paymentHistory: factors.paymentHistory || 0,
          creditUtilization: factors.creditUtilization || 0,
          creditAge: factors.creditAge || 0,
          totalAccounts: factors.totalAccounts || 0,
          creditInquiries: factors.creditInquiries || 0
        }
      });
      
      setError(null);
    } catch (error) {
      console.error('Error fetching credit data:', error);
      setError('Failed to load credit data. Please try again.');
      
      // Fallback to mock data in case of error
      setCreditData({
        score: 745,
        history: mockScoreHistory,
        factors: {
          paymentHistory: 35,
          creditUtilization: 28,
          creditAge: 18,
          totalAccounts: 4,
          creditInquiries: 2,
        }
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user, mockScoreHistory]);
  
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await fetchCreditData();
  };
  
  // Set up the effect for fetching data
  useEffect(() => {
    if (user) {
      fetchCreditData();
    }
  }, [user, fetchCreditData]);

  // Calculate score change
  const history = creditData.history || [];
  const lastEntryIndex = history.length - 1;
  const currentScore = history[lastEntryIndex]?.score || 0;
  const previousScore = history.length > 1 ? history[lastEntryIndex - 1]?.score : currentScore;
  const scoreChange = currentScore - previousScore;

  // Determine score category
  const getScoreCategory = useCallback((score) => {
    if (score >= 800) return 'Excellent';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  }, []);

  const scoreCategory = getScoreCategory(currentScore);

  // Get score color based on category
  const getScoreColor = useCallback((score) => {
    if (score >= 800) return 'bg-gradient-to-r from-teal-500 to-emerald-600';
    if (score >= 740) return 'bg-gradient-to-r from-green-500 to-teal-500';
    if (score >= 670) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
    if (score >= 580) return 'bg-gradient-to-r from-orange-500 to-amber-500';
    return 'bg-gradient-to-r from-red-500 to-orange-500';
  }, []);

  const scoreColor = getScoreColor(currentScore);

  // Convert factors object to array for rendering
  const factorsArray = useMemo(() => [
    { 
      name: 'Payment History', 
      score: creditData.factors.paymentHistory || 0, 
      status: creditData.factors.paymentHistory > 90 ? 'Excellent' : creditData.factors.paymentHistory > 80 ? 'Good' : 'Fair',
      statusColor: creditData.factors.paymentHistory > 90 ? 'text-emerald-500' : creditData.factors.paymentHistory > 80 ? 'text-green-500' : 'text-amber-500',
      icon: <FiClock className="text-indigo-500" />,
      tooltip: 'Percentage of on-time payments'
    },
    { 
      name: 'Credit Utilization', 
      score: creditData.factors.creditUtilization || 0, 
      status: creditData.factors.creditUtilization <= 30 ? 'Excellent' : creditData.factors.creditUtilization <= 50 ? 'Good' : 'Fair',
      statusColor: creditData.factors.creditUtilization <= 30 ? 'text-emerald-500' : creditData.factors.creditUtilization <= 50 ? 'text-green-500' : 'text-amber-500',
      icon: <FiCreditCard className="text-blue-500" />,
      tooltip: 'Percentage of available credit being used'
    },
    { 
      name: 'Credit Age', 
      score: creditData.factors.creditAge || 0, 
      status: creditData.factors.creditAge > 7 ? 'Excellent' : creditData.factors.creditAge > 5 ? 'Good' : 'Fair',
      statusColor: creditData.factors.creditAge > 7 ? 'text-emerald-500' : creditData.factors.creditAge > 5 ? 'text-green-500' : 'text-amber-500',
      icon: <FiTrendingUp className="text-green-500" />,
      tooltip: 'Average age of your credit accounts'
    },
    { 
      name: 'Total Accounts', 
      score: creditData.factors.totalAccounts || 0, 
      status: creditData.factors.totalAccounts > 5 ? 'Excellent' : creditData.factors.totalAccounts > 3 ? 'Good' : 'Fair',
      statusColor: creditData.factors.totalAccounts > 5 ? 'text-emerald-500' : creditData.factors.totalAccounts > 3 ? 'text-green-500' : 'text-amber-500',
      icon: <FiShield className="text-purple-500" />,
      tooltip: 'Number of active credit accounts'
    },
    { 
      name: 'Credit Inquiries', 
      score: creditData.factors.creditInquiries || 0, 
      status: creditData.factors.creditInquiries <= 1 ? 'Excellent' : creditData.factors.creditInquiries <= 3 ? 'Good' : 'Fair',
      statusColor: creditData.factors.creditInquiries <= 1 ? 'text-emerald-500' : creditData.factors.creditInquiries <= 3 ? 'text-green-500' : 'text-amber-500',
      icon: <FiAlertCircle className="text-yellow-500" />,
      tooltip: 'Number of recent credit applications'
    },
  ], [creditData.factors]);

  // Get the last updated date
  const lastUpdated = useMemo(() => {
    return history.length > 0 ? history[history.length - 1].date : new Date().toISOString().split('T')[0];
  }, [history]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0D261C]">
        <div className="text-center p-8 bg-white dark:bg-[#1a2c24] rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">Authentication Required</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">Please log in to view your dashboard</p>
          <button 
            onClick={() => window.location.href = '/login'}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0D261C]">
        <div className="flex flex-col items-center">
          <div className="relative w-16 h-16">
            <FiRefreshCw className="animate-spin text-4xl text-emerald-600 mb-4" />
          </div>
          <p className="text-gray-600 dark:text-gray-300">Loading your credit data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f5f9ff] to-[#e6f0ff] dark:from-[#0D261C] dark:to-[#0A1F17]">
      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#1a2c24] rounded-xl max-w-md w-full shadow-2xl overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold">Premium Plan</h2>
                <button 
                  onClick={() => setShowPremiumModal(false)}
                  className="text-white/80 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <p className="opacity-90 mt-1">Unlock advanced credit features</p>
            </div>
            
            <div className="p-6">
              <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-xl">$19.99<span className="text-gray-600 dark:text-gray-400 text-sm font-normal">/month</span></h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Billed annually at $239.88</p>
                  </div>
                  <div className="flex items-center bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-1 rounded-full text-sm">
                    <FiStar className="mr-1" /> Most Popular
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <h3 className="font-semibold text-lg">Premium Features</h3>
                <ul className="space-y-3">
                  {premiumFeatures.map(feature => (
                    <li key={feature.id} className="flex items-center">
                      <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 p-2 rounded-lg mr-3">
                        {feature.icon}
                      </div>
                      <span>{feature.feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <button className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-lg font-medium transition-all">
                Upgrade to Premium
              </button>
              
              <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-4">
                7-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      )}
      
      <DashboardLayout
        header={
          <div className="flex justify-between items-center py-4 px-6 sticky top-0 bg-white dark:bg-[#0D261C] z-10 shadow-sm">
            <div className="flex items-center">
              <div className="bg-gradient-to-r from-emerald-600 to-teal-600 w-8 h-8 rounded-lg flex items-center justify-center text-white">
                <FiCreditCard />
              </div>
              <h1 className="text-xl font-bold ml-3 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                CreditWise
              </h1>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1a2c24] transition-colors">
                  <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center text-white">
                    <span className="font-medium">{user?.name?.charAt(0) || 'U'}</span>
                  </div>
                  <span className="font-medium hidden md:inline">{user?.name || 'User'}</span>
                  <FiChevronDown className="hidden md:inline" />
                </button>
                <div className="absolute right-0 mt-1 w-48 bg-white dark:bg-[#1a2c24] rounded-md shadow-lg py-1 hidden group-hover:block z-20">
                  <button className="flex items-center w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#22352c]">
                    <FiUser className="mr-3" /> Profile
                  </button>
                  <button className="flex items-center w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#22352c]">
                    <FiSettings className="mr-3" /> Settings
                  </button>
                  <button 
                    onClick={onLogout}
                    className="flex items-center w-full px-4 py-2 text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#22352c]"
                  >
                    <FiLogOut className="mr-3" /> Logout
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleRefresh}
                className="p-2 bg-white dark:bg-[#1a2c24] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#22352c]"
                disabled={isRefreshing}
                aria-label="Refresh credit data"
              >
                <FiRefreshCw className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        }
        left={
          <div className="space-y-6">
            {/* Credit Health Summary Card */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Credit Health</h2>
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  scoreCategory === 'Excellent' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                  scoreCategory === 'Very Good' ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' :
                  scoreCategory === 'Good' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                  scoreCategory === 'Fair' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                }`}>
                  {scoreCategory}
                </div>
              </div>
              
              <div className="mt-4">
                <p className="text-gray-600 dark:text-gray-300">
                  {scoreCategory === 'Excellent' ? 
                    "Your credit health is excellent! Maintain your good financial habits." :
                    scoreCategory === 'Very Good' ?
                    "Your credit health is very good. A few improvements could get you to excellent." :
                    scoreCategory === 'Good' ?
                    "Your credit health is good. Focus on these areas to improve further:" :
                    scoreCategory === 'Fair' ?
                    "Your credit health needs attention. Focus on these key areas to improve:" :
                    "Your credit health needs significant improvement. Focus on these key areas:"
                  }
                </p>
              </div>
            </div>
            
            {/* Improvement Tips */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Improvement Tips</h2>
                <FiHelpCircle className="text-gray-400 dark:text-gray-500" />
              </div>
              <div className="space-y-4">
                {creditHealthTips.map(tip => (
                  <div 
                    key={tip.id} 
                    className={`${tip.bgColor} p-4 rounded-lg transition-transform hover:scale-[1.02] cursor-pointer`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="mt-1">
                        {tip.icon}
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-800 dark:text-white">{tip.title}</h3>
                        <p className="text-gray-600 dark:text-gray-300 text-sm mt-1">{tip.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        }
        center={
          <div className="space-y-6">
            {/* Hero Score Section */}
            <div className={`${scoreColor} rounded-xl p-6 text-white shadow-lg`}>
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left mb-6 md:mb-0">
                  <h1 className="text-3xl font-bold">Your Credit Score</h1>
                  <p className="text-emerald-100 mt-1">Updated: {new Date(lastUpdated).toLocaleDateString()}</p>
                </div>
                
                <div className="flex flex-col items-center">
                  <div className="text-5xl font-bold">{currentScore}</div>
                  <div className="text-lg">out of 850</div>
                </div>
                
                <div className="mt-4 md:mt-0 flex flex-col items-center">
                  <div className="text-lg font-medium">{scoreCategory}</div>
                  {scoreChange !== 0 && (
                    <div className={`mt-1 px-3 py-1 rounded-full text-sm font-medium ${
                      scoreChange > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {scoreChange > 0 ? '+' : ''}{scoreChange} points
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            {/* Score Breakdown */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Score Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {factorsArray.map((factor, index) => (
                  <div 
                    key={index} 
                    className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="p-2 rounded-lg bg-white dark:bg-[#1a2c24] shadow-sm mr-3">
                          {factor.icon}
                        </div>
                        <div>
                          <h3 className="font-medium text-gray-800 dark:text-white">{factor.name}</h3>
                          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{factor.tooltip}</div>
                        </div>
                      </div>
                      <div className={`font-medium ${factor.statusColor}`}>
                        {factor.status}
                      </div>
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {factor.name.includes('Age') ? `${factor.score} years` : 
                         factor.name.includes('Accounts') ? `${factor.score} accounts` : 
                         factor.name.includes('Inquiries') ? `${factor.score} inquiries` : 
                         `${factor.score}%`}
                      </span>
                      <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            factor.status === 'Excellent' ? 'bg-emerald-500' :
                            factor.status === 'Good' ? 'bg-green-500' : 'bg-amber-500'
                          }`} 
                          style={{ width: `${Math.min(100, factor.score * 10)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* History Chart */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Score History</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">Last 12 months</span>
              </div>
              <div className="h-72">
                <ScoreHistoryChart data={creditData.history.length > 0 ? creditData.history : mockScoreHistory} />
              </div>
              
              {creditData.history.length > 0 && (
                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Starting Score</div>
                    <div className="text-xl font-bold text-gray-800 dark:text-white">
                      {creditData.history[0]?.score || 0}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Highest Score</div>
                    <div className="text-xl font-bold text-emerald-600">
                      {Math.max(...creditData.history.map(item => item.score))}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Net Change</div>
                    <div className={`text-xl font-bold ${
                      currentScore - creditData.history[0]?.score >= 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {currentScore - creditData.history[0]?.score >= 0 ? '+' : ''}
                      {currentScore - creditData.history[0]?.score} points
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        }
        right={
          <div className="space-y-6">
            {/* Quick Actions */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">Quick Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#22352c] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3e34] transition-all group">
                  <div className="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-300 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <FiBarChart2 size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">View Report</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#22352c] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3e34] transition-all group">
                  <div className="bg-teal-100 dark:bg-teal-900/30 text-teal-600 dark:text-teal-300 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <FiDollarSign size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Simulate</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#22352c] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3e34] transition-all group">
                  <div className="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-300 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <FiLock size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Protection</span>
                </button>
                <button className="flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-[#22352c] rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a3e34] transition-all group">
                  <div className="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-300 p-3 rounded-full mb-2 group-hover:scale-110 transition-transform">
                    <FiCheckCircle size={20} />
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Dispute</span>
                </button>
              </div>
            </div>
            
            {/* Recent Activity */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Activity</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">Last 7 days</span>
              </div>
              <RecentActivity activities={recentActivity} />
            </div>
            
            {/* Premium Features */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-5 group hover:from-emerald-700 hover:to-teal-700 transition-all cursor-pointer" onClick={() => setShowPremiumModal(true)}>
              <div className="flex items-start">
                <FiStar className="text-yellow-300 text-xl mr-3 mt-1 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <div>
                  <h3 className="font-semibold text-white">Premium Features</h3>
                  <p className="text-emerald-200 text-sm mt-1 mb-3">Unlock advanced credit tools and protection</p>
                  <button className="text-emerald-900 bg-white hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    Explore Premium
                  </button>
                </div>
              </div>
            </div>
          </div>
        }
        footer={
          <div className="py-4 px-6 text-center text-gray-500 dark:text-gray-400 text-sm border-t border-gray-100 dark:border-gray-700">
            © {new Date().getFullYear()} CreditWise • All rights reserved • Secure and encrypted
          </div>
        }
        userName={user?.name || 'User'}
        onLogout={onLogout}
      />

      {/* Error Toast */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg shadow-lg flex items-center max-w-md z-50">
          <FiAlertCircle className="mr-2 text-red-600 text-xl" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
          <button 
            onClick={() => setError(null)} 
            className="ml-4 text-red-600 hover:text-red-800"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
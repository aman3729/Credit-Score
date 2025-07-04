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
import CreditInsights from './CreditInsights';
import ImprovementTipsEngine from './ImprovementTipsEngine';

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
  const [creditData, setCreditData] = useState(null);

  const fetchCreditData = useCallback(async () => {
    try {
      setIsRefreshing(true);
      setError(null);
      if (!user?._id && !user?.id) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }
      const userId = user._id || user.id;
      const response = await api.get(`/users/${userId}/credit-data`);
      const responseData = response.data.data || response.data;
      setCreditData(responseData);
    } catch (error) {
      setError('Failed to load credit data. Please try again.');
      setCreditData(null);
      if (error.response) {
        console.error("API error response:", error.response);
      } else {
        console.error("API fetch error:", error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchCreditData();
  }, [user, fetchCreditData]);

  // Score and history
  const currentScore = creditData?.currentScore ?? 0;
  const scoreHistory = useMemo(() => {
    if (!creditData?.creditScores) return [];
    return creditData.creditScores.map(item => ({
      date: new Date(item.date).toISOString().split('T')[0],
      score: item.score || 0
    }));
  }, [creditData]);
  const lastUpdated = creditData?.creditReport?.lastUpdated
    ? new Date(creditData.creditReport.lastUpdated).toLocaleDateString()
    : 'N/A';

  // Score classification
  const getScoreCategory = (score) => {
    if (score >= 800) return 'Excellent';
    if (score >= 740) return 'Very Good';
    if (score >= 670) return 'Good';
    if (score >= 580) return 'Fair';
    return 'Poor';
  };
  const scoreCategory = getScoreCategory(currentScore);

  // Score color
  const getScoreColor = (score) => {
    if (score >= 800) return 'bg-gradient-to-r from-teal-500 to-emerald-600';
    if (score >= 740) return 'bg-gradient-to-r from-green-500 to-teal-500';
    if (score >= 670) return 'bg-gradient-to-r from-yellow-500 to-amber-500';
    if (score >= 580) return 'bg-gradient-to-r from-orange-500 to-amber-500';
    return 'bg-gradient-to-r from-red-500 to-orange-500';
  };
  const scoreColor = getScoreColor(currentScore);

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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#0D261C]">
        <div className="text-center p-8 bg-white dark:bg-[#1a2c24] rounded-xl shadow-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
          <button 
            onClick={fetchCreditData}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-6 py-3 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
          >
            Retry
          </button>
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
                  {/* Add premium features rendering logic here */}
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
                onClick={fetchCreditData}
                className="p-2 bg-white dark:bg-[#1a2c24] rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-[#22352c]"
                disabled={isRefreshing}
                aria-label="Refresh credit data"
              >
                <FiRefreshCw className={isRefreshing ? "animate-spin" : ""} />
              </button>
            </div>
          </div>
        }
        left={null}
        center={
          <div className="space-y-6">
            {/* Hero Score Section */}
            <div className={`${scoreColor} rounded-xl p-6 text-white shadow-lg`}>
              <div className="flex flex-col md:flex-row items-center justify-between">
                <div className="text-center md:text-left mb-6 md:mb-0">
                  <h1 className="text-3xl font-bold">Your Credit Score</h1>
                  <p className="text-emerald-100 mt-1">Updated: {lastUpdated}</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2">
                    <div className="text-5xl font-bold">{currentScore}</div>
                  </div>
                  <div className="text-lg">out of 850</div>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col items-center">
                  <div className="text-lg font-medium">{scoreCategory}</div>
                </div>
              </div>
              <div className="flex flex-col md:flex-row items-center justify-between mt-4">
                <div className="text-gray-200 text-sm">
                  <span>Score Version: {creditData?.scoreVersion || 'N/A'}</span>
                  {creditData?.aiEnabled && (
                    <span className="ml-2 px-2 py-1 bg-emerald-700/70 rounded text-xs">AI Enhanced</span>
                  )}
                </div>
              </div>
            </div>
            {/* Score Breakdown */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Score Breakdown</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Payment History</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Percentage of on-time payments</div>
                    </div>
                    <div className="font-medium text-emerald-500">{typeof creditData?.paymentHistory === 'number' ? `${(creditData.paymentHistory * 100).toFixed(1)}%` : 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Credit Utilization</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Percentage of available credit being used</div>
                    </div>
                    <div className="font-medium text-green-500">{creditData?.creditUtilization && typeof creditData.creditUtilization.overall === 'number' ? `${(creditData.creditUtilization.overall * 100).toFixed(1)}%` : 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Credit Age</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Average age of your credit accounts</div>
                    </div>
                    <div className="font-medium text-blue-500">{typeof creditData?.creditAgeMonths === 'number' ? `${creditData.creditAgeMonths} months` : 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Total Accounts</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Number of active credit accounts</div>
                    </div>
                    <div className="font-medium text-indigo-500">{typeof creditData?.totalAccounts === 'number' ? creditData.totalAccounts : 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Open Accounts</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Number of open credit accounts</div>
                    </div>
                    <div className="font-medium text-indigo-500">{typeof creditData?.openAccounts === 'number' ? creditData.openAccounts : 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Missed Payments</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Number of missed payments</div>
                    </div>
                    <div className="font-medium text-red-500">{typeof creditData?.recentMissedPayments === 'number' ? creditData.recentMissedPayments : 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Recent Defaults</h3>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Number of recent defaults</div>
                    </div>
                    <div className="font-medium text-red-500">{typeof creditData?.recentDefaults === 'number' ? creditData.recentDefaults : 'N/A'}</div>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Component Weights</h3>
                <div className="flex flex-wrap gap-4">
                  {[
                    { label: 'Payment History', value: creditData?.scoreResult?.breakdown?.paymentHistory ?? 0, weight: 35 },
                    { label: 'Credit Utilization', value: creditData?.scoreResult?.breakdown?.creditUtilization ?? 0, weight: 30 },
                    { label: 'Credit Age', value: creditData?.scoreResult?.breakdown?.creditAge ?? 0, weight: 15 },
                    { label: 'Credit Mix', value: creditData?.scoreResult?.breakdown?.creditMix ?? 0, weight: 10 },
                    { label: 'Inquiries', value: creditData?.scoreResult?.breakdown?.inquiries ?? 0, weight: 10 },
                    { label: 'Penalties/Bonuses', value: creditData?.scoreResult?.breakdown?.penaltiesBonuses ?? 0, weight: 0 },
                  ].map((item) => (
                    <div key={item.label} className="flex-1 min-w-[150px]">
                      <div className="flex justify-between text-xs mb-1">
                        <span>{item.label}</span>
                        <span>{item.value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full"
                          style={{ width: `${item.value}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">Weight: {item.weight}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Score History */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Score History</h2>
              <ScoreHistoryChart data={scoreHistory} />
            </div>
            {/* Financial Metrics */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Financial Metrics</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Monthly Income</h3>
                    </div>
                    <div className="font-medium text-green-600">{typeof creditData?.monthlyIncome === 'number' ? `$${creditData.monthlyIncome.toLocaleString()}` : 'N/A'}</div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-[#22352c] p-4 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium text-gray-800 dark:text-white">Total Debt</h3>
                    </div>
                    <div className="font-medium text-red-600">{typeof creditData?.totalDebt === 'number' ? `$${creditData.totalDebt.toLocaleString()}` : 'N/A'}</div>
                  </div>
                </div>
              </div>
            </div>
            {/* Loan Offer Section (if eligible) */}
            {creditData?.loanOffer && creditData.loanOffer.status !== 'Rejected' && (
              <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Loan Offer</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-gray-700 dark:text-gray-200 mb-2">Eligibility Status: <span className="font-bold">{creditData.loanOffer.status}</span></div>
                    <div>Recommended Amount: <span className="font-bold">{creditData.loanOffer.amount ? `ETB ${creditData.loanOffer.amount.toLocaleString()}` : 'N/A'}</span></div>
                    <div>Interest Rate: <span className="font-bold">{creditData.loanOffer.interestRateRange || 'N/A'}</span></div>
                    <div>Loan Term: <span className="font-bold">{creditData.loanOffer.term || 'N/A'}</span></div>
                    <div>Estimated Monthly Payment: <span className="font-bold">{creditData.loanOffer.estimatedMonthlyPayment ? `ETB ${creditData.loanOffer.estimatedMonthlyPayment.toLocaleString()}` : 'N/A'}</span></div>
                  </div>
                  <div>
                    <div className="text-gray-700 dark:text-gray-200 mb-2">Offer Scorecard:</div>
                    <ul className="list-disc ml-6 text-sm">
                      {(creditData.loanOffer.scorecard || []).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            {/* Personalized Recommendations */}
            {creditData?.recommendations && creditData.recommendations.length > 0 && (
              <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Personalized Recommendations</h2>
                <ul className="list-disc ml-6 text-gray-700 dark:text-gray-200">
                  {creditData.recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Security & Consent Info */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Security & Consent</h2>
              <div className="flex items-center gap-4 mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!creditData?.consentToShare}
                    onChange={() => {/* TODO: implement consent toggle API call */}}
                    className="form-checkbox h-5 w-5 text-emerald-600"
                  />
                  <span className="ml-2 text-gray-700 dark:text-gray-200">I authorize credit score sharing with lenders</span>
                </label>
                {/* TODO: Add audit log and PDF download if available */}
              </div>
            </div>
            {/* User Info & Support */}
            <div className="bg-white dark:bg-[#1a2c24] rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mt-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">User Info & Support</h2>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="text-gray-700 dark:text-gray-200">Verified Phone: <span className="font-bold">{creditData?.verifiedPhone || 'N/A'}</span></div>
                  <button className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition">Update Contact Info</button>
                </div>
                <div className="flex gap-2 mt-4 md:mt-0">
                  <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition">Contact Support</button>
                  <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition">Dispute my Score</button>
                </div>
              </div>
            </div>
          </div>
        }
        right={null}
      />
    </div>
  );
};

export default Dashboard;
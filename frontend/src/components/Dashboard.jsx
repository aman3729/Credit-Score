import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

// Import components
import DashboardLayout from './layout/DashboardLayout';
import CreditScoreDisplay from './CreditScoreDisplay';
import CreditFactorCard from './CreditFactorCard';
import RecentActivity from './RecentActivity';
import CreditHealthSummary from './CreditHealthSummary';
import CreditInsights from './CreditInsights';
import ImprovementTipsEngine from './ImprovementTipsEngine';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';

// Import icons
import { FiCreditCard, FiTrendingUp, FiAlertCircle, FiShield, FiClock, FiStar, 
         FiRefreshCw, FiBarChart2, FiDollarSign, FiLock, FiCheckCircle, 
         FiUser, FiSettings, FiLogOut, FiChevronDown, FiHelpCircle, FiTarget, FiZap, FiDownload, FiMail, FiShare2 } from 'react-icons/fi';

// Lazy load ScoreHistoryChart
const ScoreHistoryChart = React.lazy(() => import('./ScoreHistoryChart'));
import jsPDF from 'jspdf';
import html2pdf from 'html2pdf.js';

// Add imports for premium components and UI cards
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import PremiumToolsPanel from './PremiumToolsPanel';
import PremiumInsights from './PremiumInsights';
import PremiumAlerts from './PremiumAlerts';

export const Dashboard = ({ onLogout }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [creditData, setCreditData] = useState(null);
  const [modal, setModal] = useState(null); // 'contact' | 'profile' | 'dispute' | 'support' | null
  const { toast } = useToast();
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [exportModal, setExportModal] = useState(null); // 'email' | 'lender' | null
  const [exportEmail, setExportEmail] = useState('');
  const [openTool, setOpenTool] = useState(null); // 'score' | 'eligibility' | 'offer' | 'dti' | null
  const [simInput, setSimInput] = useState({ paymentHistory: 0.95, utilization: 0.3, score: 700, income: 5000, debt: 1000, collateral: 0 });
  const [simResult, setSimResult] = useState(null);
  const [showBreakdownMobile, setShowBreakdownMobile] = useState(true);

  const handleOpen = (type) => { setModal(type); };
  const handleClose = () => { setModal(null); setForm({ name: user?.name || '', email: user?.email || '', phone: user?.phone || '', address: user?.address || '', subject: '', message: '' }); };

  const handleChange = (e) => { setForm(f => ({ ...f, [e.target.name]: e.target.value })); };

  const handleSubmit = async (type) => {
    setLoading(true);
    try {
      if (type === 'contact' || type === 'profile') {
        await api.put(`/users/${user._id || user.id}`, form);
        toast({ title: 'Success', description: 'Profile updated successfully.' });
        fetchCreditData && fetchCreditData();
      } else if (type === 'dispute') {
        await api.post('/disputes', { subject: form.subject, message: form.message });
        toast({ title: 'Dispute Submitted', description: 'Your score dispute has been submitted.' });
      } else if (type === 'support') {
        await api.post('/support', { subject: form.subject, message: form.message });
        toast({ title: 'Support Request Sent', description: 'Your support request has been sent.' });
      }
      handleClose();
    } catch (err) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Something went wrong.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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
      const response = await api.get(`/user/${userId}/credit-data`);
      const responseData = response.data.data || response.data;
      // Ensure lendingDecision is always set, fallback to latest in lendingDecisionHistory if needed
      let lendingDecision = responseData.lendingDecision;
      if (
        (!lendingDecision || Object.keys(lendingDecision).length === 0 || lendingDecision.decision === undefined)
        && Array.isArray(responseData.lendingDecisionHistory)
        && responseData.lendingDecisionHistory.length > 0
      ) {
        lendingDecision = responseData.lendingDecisionHistory[responseData.lendingDecisionHistory.length - 1];
      }
      setCreditData({
        ...responseData,
        lendingDecision,
      });
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
  }, [user]); // Remove fetchCreditData dependency to prevent recreation

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

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.text('Credit Report', 10, 10);
    doc.text(JSON.stringify(creditData, null, 2), 10, 20);
    doc.save('credit-report.pdf');
  };

  const handleSendEmail = async () => {
    try {
      await api.post(`/users/${user._id || user.id}/send-report`, { email: exportEmail });
      toast({ title: 'Report Sent', description: 'The report has been sent to your email.' });
      setExportModal(null);
    } catch (err) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to send email.', variant: 'destructive' });
    }
  };

  const handleShareLender = async () => {
    try {
      await api.post(`/users/${user._id || user.id}/share-score`, { email: exportEmail });
      toast({ title: 'Score Shared', description: 'The score has been shared with the lender.' });
      setExportModal(null);
    } catch (err) {
      toast({ title: 'Error', description: err?.response?.data?.message || 'Failed to share with lender.', variant: 'destructive' });
    }
  };

  const handleSimChange = e => setSimInput(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleScoreSim = async () => {
    try {
      const res = await api.post('/score/simulate', { paymentHistory: simInput.paymentHistory, utilization: simInput.utilization });
      setSimResult(`Simulated Score: ${res.data.score}${res.data.dti !== undefined ? ` | DTI: ${(res.data.dti * 100).toFixed(1)}%` : ''}`);
    } catch (err) {
      setSimResult('Error simulating score');
    }
  };
  const handleEligibility = async () => {
    try {
      const res = await api.post('/loan/eligibility', { score: simInput.score, income: simInput.income, debt: simInput.debt });
      setSimResult(`${res.data.eligible ? 'Eligible for loan' : 'Not eligible for loan'}${res.data.dti !== undefined ? ` | DTI: ${(res.data.dti * 100).toFixed(1)}%` : ''}`);
    } catch (err) {
      setSimResult('Error checking eligibility');
    }
  };
  const handleOffer = async () => {
    try {
      const res = await api.post('/loan/offer', { score: simInput.score, income: simInput.income, collateral: simInput.collateral });
      setSimResult(res.data.offer ? `Offer: $${res.data.offer.amount} at ${res.data.offer.rate}% for ${res.data.offer.term} months${res.data.offer.dti !== undefined ? ` | DTI: ${(res.data.offer.dti * 100).toFixed(1)}%` : ''}` : 'No offers available');
    } catch (err) {
      setSimResult('Error simulating offer');
    }
  };
  const handleDTI = async () => {
    try {
      const res = await api.post('/loan/dti', { income: simInput.income, debt: simInput.debt });
      setSimResult(res.data.dti !== undefined ? `DTI: ${(res.data.dti * 100).toFixed(1)}%` : 'Error calculating DTI');
    } catch (err) {
      setSimResult('Error calculating DTI');
    }
  };

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
    <div className="min-h-screen dark:bg-[#18191a] flex flex-col">
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
          <header className="flex justify-between items-center py-5 px-8 sticky top-0 z-30 bg-white/70 dark:bg-[#0D261C]/80 backdrop-blur-xl shadow-lg border-b border-[#E5E7EB] dark:border-[#222325] transition-all">
            {/* Left: Brand */}
            <div className="flex items-center gap-4">
              <div className="bg-gradient-to-br from-[#2563EB] to-[#0E9F6E] w-12 h-12 rounded-2xl flex items-center justify-center text-white text-3xl shadow-lg">
                <FiCreditCard />
              </div>
              <div>
                <span className="block text-2xl font-extrabold bg-gradient-to-r from-[#2563EB] to-[#0E9F6E] bg-clip-text text-transparent font-inter tracking-tight leading-tight">Credit Score</span>
                <span className="block text-xs font-medium text-[#2563EB] dark:text-[#0E9F6E] tracking-wide mt-0.5">Dashboard</span>
              </div>
            </div>
            {/* Center: Section Title */}
            <div className="hidden md:flex flex-col items-center">
              <h1 className="text-2xl font-bold text-[#1F2937] dark:text-white font-inter tracking-tight">Welcome, {user?.name || 'User'}</h1>
              <span className="text-xs text-gray-500 dark:text-gray-400 font-inter mt-1">Your financial health at a glance</span>
            </div>
            {/* Right: User */}
            <div className="relative group">
              <button className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-[#2563EB]/10 dark:hover:bg-[#0E9F6E]/10 transition-colors focus:outline-none border border-transparent hover:border-[#2563EB] dark:hover:border-[#0E9F6E]">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#0E9F6E] to-[#2563EB] flex items-center justify-center text-white text-xl font-bold font-inter shadow">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="font-inter font-semibold text-[#1F2937] dark:text-white text-base">{user?.name || 'User'}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-inter">{user?.role || 'user'}</span>
                </div>
                <FiChevronDown className="hidden md:inline text-lg text-[#2563EB] dark:text-[#0E9F6E] ml-2" />
              </button>
              {/* Dropdown */}
              <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-[#1a2c24] rounded-xl shadow-2xl py-2 hidden group-hover:block z-40 border border-[#E5E7EB] dark:border-[#222325]">
                <button className="flex items-center w-full px-4 py-2 text-left text-[#1F2937] dark:text-white hover:bg-[#2563EB]/10 dark:hover:bg-[#0E9F6E]/10 rounded-lg">
                  <FiUser className="mr-3" /> Profile
                </button>
                <button onClick={onLogout} className="flex items-center w-full px-4 py-2 text-left text-[#DC2626] hover:bg-[#DC2626]/10 rounded-lg">
                  <FiLogOut className="mr-3" /> Logout
                </button>
              </div>
            </div>
          </header>
        }
        left={null}
        center={
          <div className="space-y-6">
            {/* Hero Score Section */}
            <div className={`${scoreColor} rounded-xl p-6 text-white shadow-lg`}>
              <div className="grid grid-cols-1 md:grid-cols-3 items-center">
                {/* Left: Title */}
                <div className="text-center md:text-left mb-6 md:mb-0">
                  <h1 className="text-3xl font-bold">Your Credit Score</h1>
                  <p className="text-emerald-100 mt-1">Updated: {lastUpdated}</p>
                </div>
                {/* Center: Score */}
                <div className="flex flex-col items-center justify-center">
                  <div className="text-5xl font-extrabold font-inter tracking-tight">{currentScore}</div>
                  <div className="text-lg font-inter">out of 850</div>
                </div>
                {/* Right: Category */}
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
                  <div>
                    Engine: {creditData?.engine === 'default' ? 'FF Score' : creditData?.engine === 'creditworthiness' ? 'TF Score' : (creditData?.engine || 'Unknown')}
                    {creditData?.engineVersion && (
                      <span className="ml-2 px-2 py-1 bg-emerald-700/70 rounded text-xs">v{creditData.engineVersion}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Modern grid layout for main dashboard cards */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start h-full">
              {/* Main left column (2/3) */}
              <div className="lg:col-span-2 space-y-8">
                {/* Score Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl font-semibold text-[#1F2937] dark:text-white font-inter mb-0 flex items-center gap-2">
                      <FiBarChart2 className="text-[#2563EB]" /> Score Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl md:text-2xl font-semibold text-[#1F2937] dark:text-white font-inter mb-0">Score Breakdown</h2>
                      {/* Mobile: Expand/Collapse */}
                      <button
                        className="md:hidden text-[#2563EB] font-medium focus:outline-none"
                        onClick={() => setShowBreakdownMobile(v => !v)}
                        aria-expanded={showBreakdownMobile ? 'true' : 'false'}
                        aria-controls="score-breakdown-list"
                      >
                        {showBreakdownMobile ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    <div
                      id="score-breakdown-list"
                      className={`grid md:grid-cols-3 grid-cols-1 gap-4 transition-all duration-300 ${showBreakdownMobile === false && window.innerWidth <= 768 ? 'max-h-0 overflow-hidden' : 'max-h-[1000px]'}`}
                    >
                      {[
                        { label: 'Payment History', value: creditData?.scoreResult?.breakdown?.paymentHistory, weight: 35, icon: <FiClock className="inline-block mr-1 text-[#2563EB]" aria-hidden="true" /> },
                        { label: 'Credit Utilization', value: creditData?.scoreResult?.breakdown?.creditUtilization, weight: 30, icon: <FiBarChart2 className="inline-block mr-1 text-[#0E9F6E]" aria-hidden="true" /> },
                        { label: 'Credit Age', value: creditData?.scoreResult?.breakdown?.creditAge, weight: 15, icon: <FiTrendingUp className="inline-block mr-1 text-[#2563EB]" aria-hidden="true" /> },
                        { label: 'Credit Mix', value: creditData?.scoreResult?.breakdown?.creditMix, weight: 10, icon: <FiStar className="inline-block mr-1 text-[#0E9F6E]" aria-hidden="true" /> },
                        { label: 'Inquiries', value: creditData?.scoreResult?.breakdown?.inquiries, weight: 10, icon: <FiAlertCircle className="inline-block mr-1 text-[#DC2626]" aria-hidden="true" /> },
                        { label: 'Penalties/Bonuses', value: creditData?.scoreResult?.breakdown?.penaltiesBonuses ?? 0, weight: 0, icon: <FiShield className="inline-block mr-1 text-[#2563EB]" aria-hidden="true" /> },
                      ].map((item) => {
                        const percent = Math.max(0, Math.min(100, typeof item.value === 'number' ? (item.value * 100) : 0));
                        const valueColor = percent < 30 ? 'text-[#DC2626]' : percent > 80 ? 'text-[#0E9F6E]' : 'text-[#6B7280]';
                        return (
                          <div
                            key={item.label}
                            className="rounded-xl bg-white/80 dark:bg-[#f9fafb]/10 border border-[#E5E7EB] shadow-sm p-4 flex flex-col justify-between min-w-[150px] glass-card"
                            aria-label={`${item.label} breakdown`}
                          >
                            <div className="flex items-center mb-2">
                              {item.icon}
                              <span className="font-inter font-medium text-[#1F2937] dark:text-white text-base ml-1">{item.label} <span className="font-normal text-[#6B7280]">• {item.weight}%</span></span>
                            </div>
                            <div className="flex items-center justify-between mb-1">
                              <span className={`font-inter text-sm ${valueColor}`}>{typeof item.value === 'number' ? `${percent.toFixed(1)}%` : <span title="Connect accounts to populate">─</span>}</span>
                              <span className="sr-only">{item.label} is {typeof item.value === 'number' ? `${percent.toFixed(1)}%` : '─'} out of 100%</span>
                            </div>
                            <div className="w-full bg-[#E5E7EB] rounded-full h-2 relative overflow-hidden" aria-label={`${item.label} progress bar`}>
                              <div
                                className="h-2 rounded-full bg-gradient-to-r from-[#2563EB] to-[#0E9F6E] animate-progress"
                                style={{ width: `${percent}%`, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }}
                                aria-valuenow={percent}
                                aria-valuemin={0}
                                aria-valuemax={100}
                                role="progressbar"
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                {/* Financial Metrics */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl font-semibold text-[#1F2937] dark:text-white font-inter mb-0 flex items-center gap-2">
                      <FiDollarSign className="text-[#0E9F6E]" /> Financial Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                      {/* DTI Gauge */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                        <div className="relative w-40 h-24 md:w-56 md:h-32">
                          {/* SVG Half-circle Gauge */}
                          <svg viewBox="0 0 200 100" width="100%" height="100%" aria-label="DTI Gauge">
                            <defs>
                              <linearGradient id="dtiGaugeGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="#0E9F6E" />
                                <stop offset="60%" stopColor="#FACC15" />
                                <stop offset="100%" stopColor="#DC2626" />
                              </linearGradient>
                            </defs>
                            <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="#E5E7EB" strokeWidth="16" />
                            <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="url(#dtiGaugeGradient)" strokeWidth="12" strokeLinecap="round" />
                            {/* Needle */}
                            {typeof creditData?.dti === 'number' && !isNaN(creditData.dti) ? (
                              <g>
                                <line
                                  x1="100"
                                  y1="100"
                                  x2={100 + 80 * Math.cos(Math.PI * (1 - creditData.dti))}
                                  y2={100 - 80 * Math.sin(Math.PI * (1 - creditData.dti))}
                                  stroke="#2563EB"
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  className="transition-all duration-700"
                                />
                                <circle cx={100 + 80 * Math.cos(Math.PI * (1 - creditData.dti))} cy={100 - 80 * Math.sin(Math.PI * (1 - creditData.dti))} r="6" fill="#2563EB" />
                                {/* Centered DTI Value */}
                                <text x="100" y="70" textAnchor="middle" fontSize="2.2em" fontWeight="bold" fill={creditData.dti < 0.36 ? '#0E9F6E' : creditData.dti < 0.45 ? '#FACC15' : '#DC2626'}>{`${(creditData.dti * 100).toFixed(1)}%`}</text>
                              </g>
                            ) : (
                              <text x="100" y="70" textAnchor="middle" fontSize="2.2em" fontWeight="bold" fill="#6B7280">─</text>
                            )}
                          </svg>
                          <div className="absolute left-0 right-0 bottom-0 flex justify-between px-2">
                            <span className="font-inter font-bold text-base md:text-lg text-[#1F2937] dark:text-[#F9FAFB] drop-shadow-sm bg-white/70 dark:bg-[#1a2c24]/80 rounded px-1">0%</span>
                            <span className="font-inter font-bold text-base md:text-lg text-[#1F2937] dark:text-[#F9FAFB] drop-shadow-sm bg-white/70 dark:bg-[#1a2c24]/80 rounded px-1">36%</span>
                            <span className="font-inter font-bold text-base md:text-lg text-[#1F2937] dark:text-[#F9FAFB] drop-shadow-sm bg-white/70 dark:bg-[#1a2c24]/80 rounded px-1">45%+</span>
                          </div>
                        </div>
                        <div className="mt-2 font-inter font-semibold text-base md:text-lg text-[#1F2937] dark:text-[#F9FAFB] drop-shadow-sm">Your DTI</div>
                        <div className="text-sm md:text-base font-inter font-semibold text-[#2563EB] dark:text-[#0E9F6E] mt-1 drop-shadow-sm">DTI below 36% is considered good</div>
                        <div className={`font-bold text-lg mt-1 ${creditData?.dti < 0.36 ? 'text-[#0E9F6E]' : creditData?.dti < 0.45 ? 'text-[#FACC15]' : 'text-[#DC2626]'}`}>{typeof creditData?.dti === 'number' ? `${(creditData.dti * 100).toFixed(1)}%` : <span title="Connect accounts to populate">─</span>}</div>
                      </div>
                      {/* Income/Debt */}
                      <div className="flex-1 flex flex-col gap-4 md:gap-6">
                        <div className="rounded-xl bg-white/80 dark:bg-[#f9fafb]/10 border border-[#E5E7EB] shadow-sm p-4 flex items-center justify-between glass-card">
                          <span className="font-inter text-[#6B7280] text-base">Monthly Income</span>
                          <span className="font-bold text-[#0E9F6E] text-lg">{typeof creditData?.monthlyIncome === 'number' ? `$${creditData.monthlyIncome.toLocaleString()}` : <span title="Connect accounts to populate">─</span>}</span>
                        </div>
                        <div className="rounded-xl bg-white/80 dark:bg-[#f9fafb]/10 border border-[#E5E7EB] shadow-sm p-4 flex items-center justify-between glass-card">
                          <span className="font-inter text-[#6B7280] text-base">Total Debt</span>
                          <span className="font-bold text-[#DC2626] text-lg">{typeof creditData?.totalDebt === 'number' ? `$${creditData.totalDebt.toLocaleString()}` : <span title="Connect accounts to populate">─</span>}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Final Offer Details (User Loan Offer) */}
                {creditData?.lendingDecision && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl md:text-2xl font-semibold text-[#1F2937] dark:text-white font-inter mb-4 flex items-center gap-2">
                        <FiLock className="text-[#2563EB]" /> Eligible Offer Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <div className="flex justify-between"><span>Loan Amount Offered:</span><span className="font-bold">{creditData.lendingDecision.maxLoanAmount ?? creditData.lendingDecision.approvedAmount ?? offer.maxAmount ? `$${(creditData.lendingDecision.maxLoanAmount ?? creditData.lendingDecision.approvedAmount ?? offer.maxAmount).toLocaleString()}` : 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Interest Rate:</span><span className="font-bold">{creditData.lendingDecision.suggestedInterestRate ?? creditData.lendingDecision.interestRate ?? offer.interestRate ?? 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Term (Months):</span><span className="font-bold">{creditData.lendingDecision.term ?? creditData.lendingDecision.termMonths ?? offer.term ?? offer.sampleTerm ? `${creditData.lendingDecision.term ?? creditData.lendingDecision.termMonths ?? offer.term ?? offer.sampleTerm} months` : 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Estimated Monthly Payment:</span><span className="font-bold">{creditData.lendingDecision.estimatedMonthlyPayment ?? offer.monthlyPayment ?? offer.samplePayment ? `$${(creditData.lendingDecision.estimatedMonthlyPayment ?? offer.monthlyPayment ?? offer.samplePayment).toLocaleString()}` : 'N/A'}</span></div>
                          <div className="flex justify-between"><span>APR:</span><span className="font-bold">{creditData.lendingDecision.apr ?? offer.apr ?? 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Total Interest:</span><span className="font-bold">{creditData.lendingDecision.totalInterest ?? offer.totalInterest ? `$${(creditData.lendingDecision.totalInterest ?? offer.totalInterest).toLocaleString()}` : 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Total Repayment:</span><span className="font-bold">{creditData.lendingDecision.totalRepayment ?? offer.totalRepayment ? `$${(creditData.lendingDecision.totalRepayment ?? offer.totalRepayment).toLocaleString()}` : 'N/A'}</span></div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between"><span>Classification:</span><span className="font-bold">{creditData.lendingDecision.classification || 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Risk Tier:</span><span className="font-bold">{creditData.lendingDecision.riskTierLabel || creditData.lendingDecision.riskTier || 'N/A'}</span></div>
                          <div className="flex justify-between"><span>Default Risk:</span><span className="font-bold">{creditData.lendingDecision.defaultRiskEstimate || 'N/A'}</span></div>
                          <div className="flex justify-between"><span>DTI Ratio:</span><span className="font-bold">{typeof creditData.lendingDecision.dti === 'number' ? `${(creditData.lendingDecision.dti * 100).toFixed(1)}%` : offer.dti ? `${(offer.dti * 100).toFixed(1)}%` : 'N/A'}</span></div>
                          <div className="flex justify-between"><span>DTI Rating:</span><span className="font-bold">{creditData.lendingDecision.dtiRating || offer.dtiRating || 'N/A'}</span></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
                {/* Score History */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <FiClock className="text-[#2563EB]" /> Score History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={<div className="h-64 flex items-center justify-center text-gray-400">Loading chart...</div>}>
                      <ScoreHistoryChart data={scoreHistory} />
                    </Suspense>
                  </CardContent>
                </Card>
                {/* Loan Offer Section (if eligible) */}
                {creditData?.loanOffer && creditData.loanOffer.status !== 'Rejected' && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <FiLock className="text-[#2563EB]" /> Loan Offer
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                    </CardContent>
                  </Card>
                )}
                {/* Personalized Recommendations */}
                {creditData?.recommendations && creditData.recommendations.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <FiTarget className="text-[#2563EB]" /> Personalized Recommendations
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc ml-6 text-gray-700 dark:text-gray-200">
                        {creditData.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                )}
                {/* Security & Consent */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-xl md:text-2xl font-semibold text-[#1F2937] dark:text-white font-inter mb-0 flex items-center gap-2">
                      <FiShield className="text-[#2563EB]" /> Security & Consent
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-4 mb-2 md:mb-0">
                        <label className="flex items-center cursor-pointer select-none">
                          <span className="mr-2 text-[#1F2937] dark:text-white font-inter">I authorize credit score sharing with lenders</span>
                          <span className="relative">
                            <input
                              type="checkbox"
                              checked={!!creditData?.consentToShare}
                              onChange={() => {/* TODO: implement consent toggle API call */}}
                              className="sr-only peer"
                              aria-checked={!!creditData?.consentToShare}
                              aria-label="Consent to share credit score"
                            />
                            <span className={`block w-11 h-6 rounded-full transition bg-[#E5E7EB] peer-checked:bg-[#0E9F6E]`}></span>
                            <span className={`absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow transition peer-checked:translate-x-5`}></span>
                          </span>
                          {creditData?.consentToShare && <span className="ml-2 text-[#0E9F6E] font-semibold">Authorized</span>}
                        </label>
                      </div>
                      {/* Export Buttons */}
                      <div className="flex gap-2 md:gap-4">
                        <button
                          className="flex items-center justify-center rounded-full bg-white/90 dark:bg-[#f9fafb]/10 border border-[#E5E7EB] shadow-md p-3 md:px-4 md:py-2 hover:bg-[#2563EB]/10 transition-all duration-200 focus:outline-none"
                          onClick={handleDownloadPDF}
                          aria-label="Download PDF"
                        >
                          <FiDownload className="text-xl text-[#2563EB]" aria-hidden="true" />
                          <span className="hidden md:inline ml-2 font-inter text-[#1F2937]">PDF</span>
                        </button>
                        <button
                          className="flex items-center justify-center rounded-full bg-white/90 dark:bg-[#f9fafb]/10 border border-[#E5E7EB] shadow-md p-3 md:px-4 md:py-2 hover:bg-[#2563EB]/10 transition-all duration-200 focus:outline-none"
                          onClick={() => setExportModal('email')}
                          aria-label="Send to Email"
                        >
                          <FiMail className="text-xl text-[#2563EB]" aria-hidden="true" />
                          <span className="hidden md:inline ml-2 font-inter text-[#1F2937]">Email</span>
                        </button>
                        <button
                          className="flex items-center justify-center rounded-full bg-white/90 dark:bg-[#f9fafb]/10 border border-[#E5E7EB] shadow-md p-3 md:px-4 md:py-2 hover:bg-[#2563EB]/10 transition-all duration-200 focus:outline-none"
                          onClick={() => setExportModal('lender')}
                          aria-label="Share with Lender"
                        >
                          <FiShare2 className="text-xl text-[#2563EB]" aria-hidden="true" />
                          <span className="hidden md:inline ml-2 font-inter text-[#1F2937]">Share</span>
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                {/* Alerts & Recommendations (modernized) */}
                <div className="max-h-[400px] overflow-auto">
                  <PremiumAlerts user={user} maxItems={3} />
                </div>
                {/* AI Insights */}
                <div className="max-h-[400px] overflow-auto">
                  <PremiumInsights creditData={creditData} scoreImprovement={{change: 0, percentage: 0, trend: 'neutral'}} maxItems={3} />
                </div>
              </div>
              {/* Right column (1/3): Tools Panel */}
              <Card>
                <CardContent className="pb-0">
                  <PremiumToolsPanel user={user} creditData={creditData} compact />
                </CardContent>
              </Card>
            </div>
          </div>
        }
        right={null}
      />
      {/* Fixed Bottom Nav for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden flex justify-around items-center bg-white/90 dark:bg-[#1a2c24]/90 border-t border-[#E5E7EB] shadow-lg py-2">
        <button className="flex flex-col items-center text-[#2563EB] focus:outline-none" aria-label="Tools" onClick={() => setOpenTool('score')}>
          <FiBarChart2 className="text-2xl" />
          <span className="text-xs font-inter">Tools</span>
        </button>
        <button className="flex flex-col items-center text-[#2563EB] focus:outline-none" aria-label="Export" onClick={() => setExportModal('email')}>
          <FiDownload className="text-2xl" />
          <span className="text-xs font-inter">Export</span>
        </button>
        <button className="flex flex-col items-center text-[#2563EB] focus:outline-none" aria-label="Profile" onClick={() => handleOpen('profile')}>
          <FiUser className="text-2xl" />
          <span className="text-xs font-inter">Profile</span>
        </button>
      </nav>

      {/* Modals */}
      <Dialog open={modal === 'contact'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Update Contact Info</DialogTitle></DialogHeader>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="mb-2" />
          <Input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="mb-2" />
          <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('contact')} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'profile'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>View/Edit Profile</DialogTitle></DialogHeader>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="mb-2" />
          <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('profile')} disabled={loading}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'dispute'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Submit Score Dispute</DialogTitle></DialogHeader>
          <Input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="mb-2" />
          <Textarea name="message" value={form.message} onChange={handleChange} placeholder="Describe your dispute..." className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('dispute')} disabled={loading}>Submit</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={modal === 'support'} onOpenChange={v => !v && handleClose()}>
        <DialogContent>
          <DialogHeader><DialogTitle>Contact Support / Chatbot</DialogTitle></DialogHeader>
          <Input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="mb-2" />
          <Textarea name="message" value={form.message} onChange={handleChange} placeholder="How can we help you?" className="mb-2" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('support')} disabled={loading}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Export Modals */}
      <Dialog open={exportModal === 'email'} onOpenChange={v => !v && setExportModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Send Report to Email</DialogTitle></DialogHeader>
          <Input name="email" value={exportEmail} onChange={e => setExportEmail(e.target.value)} placeholder="Enter your email" className="mb-2" />
          <DialogFooter>
            <Button onClick={handleSendEmail}>Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={exportModal === 'lender'} onOpenChange={v => !v && setExportModal(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Share Score with Lender</DialogTitle></DialogHeader>
          <Input name="email" value={exportEmail} onChange={e => setExportEmail(e.target.value)} placeholder="Lender's email" className="mb-2" />
          <DialogFooter>
            <Button onClick={handleShareLender}>Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Modals for each tool */}
      <Dialog open={openTool === 'score'} onOpenChange={v => !v && setOpenTool(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Score Simulator</DialogTitle></DialogHeader>
          <label>Payment History (%)<Input name="paymentHistory" type="number" min="0" max="1" step="0.01" value={simInput.paymentHistory} onChange={handleSimChange} /></label>
          <label>Credit Utilization (%)<Input name="utilization" type="number" min="0" max="1" step="0.01" value={simInput.utilization} onChange={handleSimChange} /></label>
          <DialogFooter>
            <Button onClick={handleScoreSim}>Simulate</Button>
          </DialogFooter>
          {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
        </DialogContent>
      </Dialog>
      <Dialog open={openTool === 'eligibility'} onOpenChange={v => !v && setOpenTool(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Loan Eligibility Checker</DialogTitle></DialogHeader>
          <label>Score<Input name="score" type="number" value={simInput.score} onChange={handleSimChange} /></label>
          <label>Monthly Income<Input name="income" type="number" value={simInput.income} onChange={handleSimChange} /></label>
          <label>Monthly Debt<Input name="debt" type="number" value={simInput.debt} onChange={handleSimChange} /></label>
          <DialogFooter>
            <Button onClick={handleEligibility}>Check Eligibility</Button>
          </DialogFooter>
          {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
        </DialogContent>
      </Dialog>
      <Dialog open={openTool === 'offer'} onOpenChange={v => !v && setOpenTool(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Offer Simulator</DialogTitle></DialogHeader>
          <label>Score<Input name="score" type="number" value={simInput.score} onChange={handleSimChange} /></label>
          <label>Monthly Income<Input name="income" type="number" value={simInput.income} onChange={handleSimChange} /></label>
          <label>Collateral Value<Input name="collateral" type="number" value={simInput.collateral} onChange={handleSimChange} /></label>
          <DialogFooter>
            <Button onClick={handleOffer}>Simulate Offer</Button>
          </DialogFooter>
          {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
        </DialogContent>
      </Dialog>
      <Dialog open={openTool === 'dti'} onOpenChange={v => !v && setOpenTool(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>DTI Calculator</DialogTitle></DialogHeader>
          <label>Monthly Debt<Input name="debt" type="number" value={simInput.debt} onChange={handleSimChange} /></label>
          <label>Monthly Income<Input name="income" type="number" value={simInput.income} onChange={handleSimChange} /></label>
          <DialogFooter>
            <Button onClick={handleDTI}>Calculate DTI</Button>
          </DialogFooter>
          {simResult && <div className="mt-2 text-green-600">{simResult}</div>}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;

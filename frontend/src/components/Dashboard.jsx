import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { useToast } from '../hooks/use-toast';
import { 
  FiCreditCard, FiTrendingUp, FiAlertCircle, FiShield, FiClock, FiStar, 
  FiRefreshCw, FiBarChart2, FiDollarSign, FiLock, FiCheckCircle, 
  FiUser, FiSettings, FiLogOut, FiChevronDown, FiHelpCircle, FiTarget, FiZap, FiDownload, FiMail, FiShare2 
} from 'react-icons/fi';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';

// Mock API and context (replace with your actual implementations)
// const mockUser = {
//   _id: '1',
//   name: 'John Doe',
//   email: 'john@example.com',
//   phone: '555-0123',
//   address: '123 Main St',
//   role: 'user'
// };

// const mockApi = {
//   get: (url) => Promise.resolve({
//     data: {
//       currentScore: 742,
//       scoreVersion: 'FICO 9.0',
//       aiEnabled: true,
//       engine: 'default',
//       engineVersion: '2.1',
//       creditReport: { lastUpdated: new Date().toISOString() },
//       scoreResult: {
//         breakdown: {
//           paymentHistory: 0.95,
//           creditUtilization: 0.28,
//           creditAge: 0.82,
//           creditMix: 0.76,
//           inquiries: 0.65,
//           penaltiesBonuses: 0.0
//         }
//       },
//       dti: 0.28,
//       monthlyIncome: 7500,
//       totalDebt: 2100,
//       lendingDecision: {
//         maxLoanAmount: 25000,
//         suggestedInterestRate: 6.5,
//         term: 60,
//         estimatedMonthlyPayment: 484,
//         classification: 'Prime',
//         riskTierLabel: 'Low Risk',
//         defaultRiskEstimate: '2.1%',
//         dti: 0.28
//       },
//       creditScores: [
//         { date: '2024-01-01', score: 720 },
//         { date: '2024-02-01', score: 735 },
//         { date: '2024-03-01', score: 742 }
//       ],
//       consentToShare: true,
//       recentActivities: [
//         { type: 'inquiry', description: 'New inquiry detected', date: '2024-12-13' },
//         { type: 'payment', description: 'Payment processed', date: '2024-12-10' }
//       ],
//       recommendations: [
//         'Keep credit utilization below 10% for optimal scores',
//         'Set up automatic payments to maintain perfect payment history',
//         'Consider increasing credit limits to improve utilization ratio'
//       ]
//     }
//   }),
//   put: () => Promise.resolve({}),
//   post: (url, data) => {
//     if (url.includes('/score/simulate')) {
//       return Promise.resolve({ data: { score: 750, dti: data && data.utilization !== undefined ? data.utilization : 0.28 } });
//     }
//     if (url.includes('/loan/eligibility')) {
//       return Promise.resolve({ data: { eligible: true, dti: 0.28 } });
//     }
//     if (url.includes('/loan/offer')) {
//       return Promise.resolve({ data: { offer: { amount: 25000, rate: 6.5, term: 60 } } });
//     }
//     if (url.includes('/loan/dti')) {
//       return Promise.resolve({ data: { dti: (data && data.debt ? data.debt : 0) / (data && data.income ? data.income : 1) } });
//     }
//     return Promise.resolve({ data: {} });
//   }
// };

// const useAuth = () => ({ user: mockUser });

// Mock components (replace with your actual components)
const DashboardLayout = ({ header, center }) => (
  <div className="min-h-screen bg-background">
    {header}
    <main>{center}</main>
  </div>
);

const CreditScoreDisplay = ({ score }) => (
  <div className="text-center">
    <div className="text-4xl font-bold">{score}</div>
  </div>
);

const RecentActivity = ({ activities }) => (
  <div className="space-y-2">
    {activities?.map((activity, idx) => (
      <div key={idx} className="financial-card p-3 text-sm">
        <div className="font-medium text-foreground mb-1">{activity.description}</div>
        <div className="text-xs text-muted-foreground">{new Date(activity.date).toLocaleDateString()}</div>
      </div>
    ))}
  </div>
);

const ScoreHistoryChart = ({ data }) => (
  <div className="h-48 flex items-center justify-center financial-card">
    <div className="text-center">
      <FiBarChart2 className="text-3xl text-primary mx-auto mb-2" />
      <div className="text-foreground font-medium">Score History Chart</div>
      <div className="text-sm text-muted-foreground mt-1">
        {data?.length} data points available
      </div>
    </div>
  </div>
);

const PremiumToolsPanel = ({ user, creditData }) => (
  <div className="space-y-4">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
        <FiZap className="text-white text-sm" />
      </div>
      <h3 className="font-semibold text-foreground">Premium Tools</h3>
    </div>
    <div className="space-y-2">
      <button className="btn-primary-subtle w-full justify-start">
        <FiBarChart2 className="mr-2 text-sm" />
        Score Simulator
      </button>
      <button className="btn-primary-subtle w-full justify-start">
        <FiTarget className="mr-2 text-sm" />
        Loan Eligibility
      </button>
      <button className="btn-primary-subtle w-full justify-start">
        <FiDollarSign className="mr-2 text-sm" />
        DTI Calculator
      </button>
    </div>
  </div>
);

const PremiumInsights = ({ creditData, maxItems }) => (
  <div className="space-y-2">
    <div className="financial-card p-3">
      <div className="text-sm text-foreground">Your utilization rate improved by 5% this month</div>
    </div>
    <div className="financial-card p-3">
      <div className="text-sm text-foreground">Consider paying down Card #1 for optimal score improvement</div>
    </div>
  </div>
);

const PremiumAlerts = ({ user, maxItems }) => (
  <div className="space-y-2">
    <div className="financial-card p-3">
      <div className="text-sm font-medium text-foreground">New inquiry detected</div>
      <div className="text-xs text-muted-foreground mt-1">2 days ago</div>
    </div>
    <div className="financial-card p-3">
      <div className="text-sm font-medium text-foreground">Payment processed</div>
      <div className="text-xs text-muted-foreground mt-1">5 days ago</div>
    </div>
  </div>
);

export const Dashboard = ({ onLogout }) => {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [creditData, setCreditData] = useState(null);
  const [modal, setModal] = useState(null);
  const { toast } = useToast();
  const [form, setForm] = useState({ 
    name: user?.name || '', 
    email: user?.email || '', 
    phone: user?.phone || '', 
    address: user?.address || '', 
    subject: '', 
    message: '' 
  });
  const [loading, setLoading] = useState(false);
  const [exportModal, setExportModal] = useState(null);
  const [exportEmail, setExportEmail] = useState('');
  const [openTool, setOpenTool] = useState(null);
  const [simInput, setSimInput] = useState({ 
    paymentHistory: 0.8, 
    utilization: 0.3, 
    score: 650, 
    income: 4000, 
    debt: 800, 
    collateral: 0 
  });
  const [simResult, setSimResult] = useState(null);
  const [showBreakdownMobile, setShowBreakdownMobile] = useState(true);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  // Track window width for responsive design
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const handleOpen = (type) => setModal(type);
  
  const handleClose = () => {
    setModal(null);
    setForm({ 
      name: user?.name || '', 
      email: user?.email || '', 
      phone: user?.phone || '', 
      address: user?.address || '', 
      subject: '', 
      message: '' 
    });
  };

  const handleChange = (e) => {
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (type) => {
    setLoading(true);
    try {
      if (type === 'contact' || type === 'profile') {
        await api.put(`/users/${user._id || user.id}`, form);
        toast({ title: 'Success', description: 'Profile updated successfully.' });
        fetchCreditData();
      } else if (type === 'dispute') {
        await api.post('/disputes', { subject: form.subject, message: form.message });
        toast({ title: 'Dispute Submitted', description: 'Your score dispute has been submitted.' });
      } else if (type === 'support') {
        await api.post('/support', { subject: form.subject, message: form.message });
        toast({ title: 'Support Request Sent', description: 'Your support request has been sent.' });
      }
      handleClose();
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err?.response?.data?.message || 'Something went wrong.', 
        variant: 'destructive' 
      });
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
      // Use the correct endpoint for your backend
      const response = await api.get(`/users/${userId}/credit-data`);
      const responseData = response.data;
      setCreditData(responseData);
    } catch (error) {
      setError('Failed to load credit data. Please try again.');
      setCreditData(null);
      console.error('API fetch error:', error);
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
    : new Date().toLocaleDateString();

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
    if (score >= 800) return 'bg-success text-success-foreground';
    if (score >= 740) return 'bg-primary text-primary-foreground';
    if (score >= 670) return 'bg-secondary text-secondary-foreground';
    if (score >= 580) return 'bg-warning text-warning-foreground';
    return 'bg-destructive text-destructive-foreground';
  };
  
  const scoreColor = getScoreColor(currentScore);

  const handleDownloadPDF = () => {
    // Mock PDF download
    const reportContent = JSON.stringify(creditData, null, 2);
    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'credit-report.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSendEmail = async () => {
    try {
      await api.post(`/users/${user._id || user.id}/send-report`, { email: exportEmail });
      toast({ title: 'Report Sent', description: 'The report has been sent to your email.' });
      setExportModal(null);
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err?.response?.data?.message || 'Failed to send email.', 
        variant: 'destructive' 
      });
    }
  };

  const handleShareLender = async () => {
    try {
      await api.post(`/users/${user._id || user.id}/share-score`, { email: exportEmail });
      toast({ title: 'Score Shared', description: 'The score has been shared with the lender.' });
      setExportModal(null);
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err?.response?.data?.message || 'Failed to share with lender.', 
        variant: 'destructive' 
      });
    }
  };

  const handleSimChange = e => {
    const value = e.target.type === 'number' ? parseFloat(e.target.value) : e.target.value;
    setSimInput(f => ({ ...f, [e.target.name]: value }));
  };

  const handleScoreSim = async () => {
    try {
      const res = await api.post('/score/simulate', { 
        paymentHistory: simInput.paymentHistory, 
        utilization: simInput.utilization 
      });
      setSimResult(`Simulated Score: ${res.data.score || 'N/A'} | DTI: ${((res.data.dti || 0) * 100).toFixed(1)}%`);
    } catch (err) {
      setSimResult('Error simulating score');
    }
  };

  const handleEligibility = async () => {
    try {
      const res = await api.post('/loan/eligibility', { 
        score: simInput.score, 
        income: simInput.income, 
        debt: simInput.debt 
      });
      setSimResult(`${res.data.eligible ? 'Eligible for loan' : 'Not eligible for loan'} | DTI: ${((res.data.dti || 0) * 100).toFixed(1)}%`);
    } catch (err) {
      setSimResult('Error checking eligibility');
    }
  };

  const handleOffer = async () => {
    try {
      const res = await api.post('/loan/offer', { 
        score: simInput.score, 
        income: simInput.income, 
        collateral: simInput.collateral 
      });
      setSimResult(res.data.offer ? 
        `Offer: $${res.data.offer.amount} at ${res.data.offer.rate}% for ${res.data.offer.term} months` : 
        'No offers available');
    } catch (err) {
      setSimResult('Error simulating offer');
    }
  };

  const handleDTI = async () => {
    try {
      const res = await api.post('/loan/dti', { 
        income: simInput.income, 
        debt: simInput.debt 
      });
      setSimResult(`DTI: ${((res.data.dti || 0) * 100).toFixed(1)}%`);
    } catch (err) {
      setSimResult('Error calculating DTI');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 financial-card max-w-md w-full mx-4">
          <div className="w-16 h-16 mx-auto mb-6 bg-primary rounded-xl flex items-center justify-center">
            <FiLock className="text-2xl text-white" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-4">Authentication Required</h2>
          <p className="text-muted-foreground mb-6 text-sm">Please log in to view your dashboard</p>
          <Button 
            onClick={() => window.location.href = '/login'}
            className="btn-primary-subtle"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mb-6">
            <FiRefreshCw className="animate-spin text-2xl text-white" />
          </div>
          <p className="text-muted-foreground">Loading your credit data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-8 financial-card max-w-md w-full mx-4">
          <div className="w-16 h-16 mx-auto mb-6 bg-destructive rounded-xl flex items-center justify-center">
            <FiAlertCircle className="text-2xl text-white" />
          </div>
          <h2 className="text-xl font-semibold text-destructive mb-4">Error</h2>
          <p className="text-muted-foreground mb-6 text-sm">{error}</p>
          <Button onClick={fetchCreditData} className="btn-primary-subtle">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // Credit factor breakdown items
  const creditFactors = [
    { label: 'Payment History', value: creditData?.scoreResult?.breakdown?.paymentHistory, weight: 35, icon: <FiClock className="text-primary" /> },
    { label: 'Credit Utilization', value: creditData?.scoreResult?.breakdown?.creditUtilization, weight: 30, icon: <FiBarChart2 className="text-success" /> },
    { label: 'Credit Age', value: creditData?.scoreResult?.breakdown?.creditAge, weight: 15, icon: <FiTrendingUp className="text-primary" /> },
    { label: 'Credit Mix', value: creditData?.scoreResult?.breakdown?.creditMix, weight: 10, icon: <FiStar className="text-secondary" /> },
    { label: 'Inquiries', value: creditData?.scoreResult?.breakdown?.inquiries, weight: 10, icon: <FiAlertCircle className="text-warning" /> },
    { label: 'Penalties/Bonuses', value: creditData?.scoreResult?.breakdown?.penaltiesBonuses ?? 0, weight: 0, icon: <FiShield className="text-primary" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Premium Modal */}
      {showPremiumModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="financial-card rounded-xl max-w-md w-full shadow-soft overflow-hidden">
            <div className="bg-primary p-6 text-white">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Premium Plan</h2>
                <Button 
                  variant="ghost"
                  onClick={() => setShowPremiumModal(false)}
                  className="text-white/80 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
                >
                  ✕
                </Button>
              </div>
              <p className="opacity-90 mt-1 text-sm">Unlock advanced credit features</p>
            </div>
            
            <div className="p-6">
              <div className="financial-card p-4 mb-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">$19.99<span className="text-muted-foreground text-sm font-normal">/month</span></h3>
                    <p className="text-xs text-muted-foreground">Billed annually at $239.88</p>
                  </div>
                  <div className="flex items-center bg-warning-light text-warning px-2 py-1 rounded-md text-xs">
                    <FiStar className="mr-1" /> Popular
                  </div>
                </div>
              </div>
              
              <div className="space-y-4 mb-6">
                <h3 className="font-medium text-foreground">Premium Features</h3>
                <ul className="space-y-2">
                  <li className="flex items-center text-muted-foreground text-sm">
                    <FiCheckCircle className="text-success mr-2 text-sm" />
                    <span>Advanced credit simulations</span>
                  </li>
                  <li className="flex items-center text-muted-foreground text-sm">
                    <FiCheckCircle className="text-success mr-2 text-sm" />
                    <span>Personalized loan recommendations</span>
                  </li>
                  <li className="flex items-center text-muted-foreground text-sm">
                    <FiCheckCircle className="text-success mr-2 text-sm" />
                    <span>Real-time credit monitoring</span>
                  </li>
                  <li className="flex items-center text-muted-foreground text-sm">
                    <FiCheckCircle className="text-success mr-2 text-sm" />
                    <span>Priority customer support</span>
                  </li>
                </ul>
              </div>
              
              <Button className="w-full bg-primary text-white hover:bg-primary/90 py-2">
                Upgrade to Premium
              </Button>
              
              <p className="text-center text-xs text-muted-foreground mt-4">
                7-day money-back guarantee
              </p>
            </div>
          </div>
        </div>
      )}
      
      <DashboardLayout
        header={
          <header className="flex justify-between items-center py-4 px-6 border-b border-card-border bg-card/50 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <h1 className="text-lg font-semibold text-foreground">Credit Dashboard</h1>
            </div>
            
            <div className="hidden md:flex items-center">
              <span className="text-sm text-muted-foreground mr-4">Welcome, {user?.name || 'User'}</span>
            </div>
            
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-accent transition-colors">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-sm font-medium">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="hidden md:flex flex-col items-start">
                  <span className="font-medium text-foreground text-sm">{user?.name || 'User'}</span>
                  <span className="text-xs text-muted-foreground">{user?.role || 'user'}</span>
                </div>
                <FiChevronDown className="hidden md:inline text-sm text-muted-foreground" />
              </button>
              
              <div className="absolute right-0 mt-2 w-48 financial-card py-1 hidden group-hover:block z-40">
                <button className="w-full text-left px-3 py-2 text-sm text-foreground hover:bg-accent flex items-center" onClick={() => handleOpen('profile')}>
                  <FiUser className="mr-2 text-sm" /> Profile
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive-light flex items-center" onClick={onLogout}>
                  <FiLogOut className="mr-2 text-sm" /> Logout
                </button>
              </div>
            </div>
          </header>
        }
        center={
          <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
            {/* Hero Score Section - Keep exactly as is per user request */}
            <div className={`${scoreColor} rounded-xl p-6 shadow-soft relative overflow-hidden`}>
              <div className="absolute inset-0 opacity-10">
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl bg-white"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full blur-3xl bg-white"></div>
              </div>
              
              <div className="relative grid grid-cols-1 md:grid-cols-3 items-center gap-6">
                <div className="text-center md:text-left">
                  <h1 className="text-2xl font-bold mb-1">Your Credit Score</h1>
                  <p className="opacity-80 text-sm">Updated: {lastUpdated}</p>
                </div>
                
                <div className="flex flex-col items-center justify-center">
                  <div className="text-5xl font-bold mb-1">{currentScore}</div>
                  <div className="text-sm opacity-80">out of 850</div>
                </div>
                
                <div className="flex flex-col items-center md:items-end">
                  <div className="text-xl font-semibold mb-1">{scoreCategory}</div>
                  <div className="flex items-center gap-2 text-sm opacity-80">
                    <FiShield className="text-sm" />
                    <span>AI Enhanced</span>
                  </div>
                </div>
              </div>
              
              <div className="relative flex flex-col md:flex-row items-center justify-between mt-4 pt-4 border-t border-white/20">
                <div className="opacity-80 text-sm">
                  <span>Score Version: {creditData?.scoreVersion || 'N/A'}</span>
                  {creditData?.aiEnabled && (
                    <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">AI Enhanced</span>
                  )}
                  <div className="mt-1">
                    Engine: {creditData?.engine === 'default' ? 'FF Score' : 
                            creditData?.engine === 'creditworthiness' ? 'TF Score' : 
                            (creditData?.engine || 'Unknown')}
                    {creditData?.engineVersion && (
                      <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-xs">v{creditData.engineVersion}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Main content grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
              <div className="xl:col-span-2 space-y-6">
                {/* Score Breakdown */}
                <Card className="financial-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                        <FiBarChart2 className="text-white text-sm" />
                      </div>
                      Score Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="font-medium text-foreground">Score Factors</h2>
                      <button 
                        className="md:hidden btn-financial"
                        onClick={() => setShowBreakdownMobile(!showBreakdownMobile)}
                      >
                        {showBreakdownMobile ? 'Hide' : 'Show'}
                      </button>
                    </div>
                    
                    <div 
                      className={`grid md:grid-cols-2 lg:grid-cols-3 grid-cols-1 gap-4 transition-all duration-300 ${!showBreakdownMobile && windowWidth <= 768 ? 'max-h-0 overflow-hidden' : 'max-h-none'}`}
                    >
                      {creditFactors.map((item) => {
                        const percent = Math.max(0, Math.min(100, typeof item.value === 'number' ? (item.value * 100) : 0));
                        const valueColor = percent < 30 ? 'text-destructive' : percent > 80 ? 'text-success' : 'text-warning';
                        
                        return (
                          <div
                            key={item.label}
                            className="metric-card"
                          >
                            <div className="flex items-center mb-3">
                              <div className="w-6 h-6 rounded-md bg-card-accent flex items-center justify-center mr-2">
                                {item.icon}
                              </div>
                              <div>
                                <div className="font-medium text-foreground text-sm">{item.label}</div>
                                <div className="text-xs text-muted-foreground">{item.weight}% weight</div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mb-2">
                              <span className={`text-sm font-semibold ${valueColor}`}>
                                {typeof item.value === 'number' ? `${percent.toFixed(1)}%` : '─'}
                              </span>
                            </div>
                            
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className="h-1.5 rounded-full bg-primary transition-all duration-500"
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
                
                {/* Financial Metrics */}
                <Card className="financial-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 bg-success rounded-md flex items-center justify-center">
                        <FiDollarSign className="text-white text-sm" />
                      </div>
                      Financial Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <div className="flex flex-col items-center justify-center">
                        <div className="relative w-40 h-24 mb-4">
                          <svg viewBox="0 0 200 100" width="100%" height="100%">
                            <defs>
                              <linearGradient id="dtiGaugeGradient" x1="0" y1="0" x2="1" y2="0">
                                <stop offset="0%" stopColor="hsl(var(--success))" />
                                <stop offset="60%" stopColor="hsl(var(--warning))" />
                                <stop offset="100%" stopColor="hsl(var(--destructive))" />
                              </linearGradient>
                            </defs>
                            <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="hsl(var(--muted))" strokeWidth="12" />
                            <path d="M20,100 A80,80 0 0,1 180,100" fill="none" stroke="url(#dtiGaugeGradient)" strokeWidth="8" strokeLinecap="round" />
                            
                            {typeof creditData?.dti === 'number' && !isNaN(creditData.dti) ? (
                              <g>
                                <line
                                  x1="100"
                                  y1="100"
                                  x2={100 + 80 * Math.cos(Math.PI * (1 - creditData.dti))}
                                  y2={100 - 80 * Math.sin(Math.PI * (1 - creditData.dti))}
                                  stroke="hsl(var(--primary))"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  className="transition-all duration-500"
                                />
                                <circle cx={100 + 80 * Math.cos(Math.PI * (1 - creditData.dti))} cy={100 - 80 * Math.sin(Math.PI * (1 - creditData.dti))} r="4" fill="hsl(var(--primary))" />
                                <text x="100" y="65" textAnchor="middle" fontSize="1.8em" fontWeight="bold" fill={creditData.dti < 0.36 ? 'hsl(var(--success))' : creditData.dti < 0.45 ? 'hsl(var(--warning))' : 'hsl(var(--destructive))'}>
                                  {`${(creditData.dti * 100).toFixed(1)}%`}
                                </text>
                              </g>
                            ) : (
                              <text x="100" y="65" textAnchor="middle" fontSize="1.8em" fontWeight="bold" fill="hsl(var(--muted-foreground))">─</text>
                            )}
                          </svg>
                          
                          <div className="absolute left-0 right-0 bottom-0 flex justify-between px-2">
                            <span className="font-medium text-success text-xs bg-success-light rounded px-1">0%</span>
                            <span className="font-medium text-warning text-xs bg-warning-light rounded px-1">36%</span>
                            <span className="font-medium text-destructive text-xs bg-destructive-light rounded px-1">45%+</span>
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="font-medium text-foreground mb-1 text-sm">Debt-to-Income Ratio</div>
                          <div className="text-xs text-muted-foreground">
                            DTI below 36% is considered good
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-4">
                        <div className="metric-card">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Monthly Income</div>
                              <div className="font-semibold text-success text-xl">
                                {typeof creditData?.monthlyIncome === 'number' ? `$${creditData.monthlyIncome.toLocaleString()}` : '─'}
                              </div>
                            </div>
                            <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center">
                              <FiTrendingUp className="text-white text-sm" />
                            </div>
                          </div>
                        </div>
                        
                        <div className="metric-card">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-muted-foreground text-xs mb-1">Total Debt</div>
                              <div className="font-semibold text-destructive text-xl">
                                {typeof creditData?.totalDebt === 'number' ? `$${creditData.totalDebt.toLocaleString()}` : '─'}
                              </div>
                            </div>
                            <div className="w-10 h-10 bg-destructive rounded-lg flex items-center justify-center">
                              <FiCreditCard className="text-white text-sm" />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Eligible Offer */}
                <Card className="financial-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 bg-secondary rounded-md flex items-center justify-center">
                        <FiLock className="text-white text-sm" />
                      </div>
                      Eligible Offer Details
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-card-border text-sm">
                          <span className="text-muted-foreground">Loan Amount:</span>
                          <span className="font-medium text-foreground">${(creditData?.lendingDecision?.maxLoanAmount ?? 'N/A').toLocaleString ? (creditData?.lendingDecision?.maxLoanAmount ?? 'N/A').toLocaleString() : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-card-border text-sm">
                          <span className="text-muted-foreground">Interest Rate:</span>
                          <span className="font-medium text-foreground">{creditData?.lendingDecision?.suggestedInterestRate ?? 'N/A'}%</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-card-border text-sm">
                          <span className="text-muted-foreground">Term:</span>
                          <span className="font-medium text-foreground">{creditData?.lendingDecision?.term ?? 'N/A'} months</span>
                        </div>
                        <div className="flex justify-between items-center py-2 text-sm">
                          <span className="text-muted-foreground">Monthly Payment:</span>
                          <span className="font-medium text-foreground">${(creditData?.lendingDecision?.estimatedMonthlyPayment ?? 'N/A').toLocaleString ? (creditData?.lendingDecision?.estimatedMonthlyPayment ?? 'N/A').toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-card-border text-sm">
                          <span className="text-muted-foreground">Classification:</span>
                          <span className="font-medium text-foreground">{creditData?.lendingDecision?.classification ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-card-border text-sm">
                          <span className="text-muted-foreground">Risk Tier:</span>
                          <span className="font-medium text-foreground">{creditData?.lendingDecision?.riskTierLabel ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-card-border text-sm">
                          <span className="text-muted-foreground">Default Risk:</span>
                          <span className="font-medium text-foreground">{creditData?.lendingDecision?.defaultRiskEstimate ?? 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 text-sm">
                          <span className="text-muted-foreground">DTI Ratio:</span>
                          <span className="font-medium text-foreground">{typeof creditData?.lendingDecision?.dti === 'number' ? `${(creditData.lendingDecision.dti * 100).toFixed(1)}%` : 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Score History */}
                <Card className="financial-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                        <FiClock className="text-white text-sm" />
                      </div>
                      Score History
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Suspense fallback={
                      <div className="h-48 flex items-center justify-center">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm">
                          <FiRefreshCw className="animate-spin" />
                          <span>Loading chart...</span>
                        </div>
                      </div>
                    }>
                      <ScoreHistoryChart data={scoreHistory} />
                    </Suspense>
                  </CardContent>
                </Card>
                
                {/* Security & Consent */}
                <Card className="financial-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold flex items-center gap-2">
                      <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
                        <FiShield className="text-white text-sm" />
                      </div>
                      Security & Export
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <label className="flex items-center cursor-pointer">
                          <span className="mr-3 text-foreground font-medium text-sm">Share with lenders</span>
                          <span className="relative">
                            <input
                              type="checkbox"
                              checked={!!creditData?.consentToShare}
                              className="sr-only peer"
                            />
                            <span className="block w-10 h-5 rounded-full transition bg-muted peer-checked:bg-success"></span>
                            <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-white shadow transition peer-checked:translate-x-5"></span>
                          </span>
                        </label>
                      </div>
                      
                      <div className="flex gap-2">
                        <button onClick={handleDownloadPDF} className="btn-financial">
                          <FiDownload className="mr-1 text-sm" /> PDF
                        </button>
                        <button onClick={() => setExportModal('email')} className="btn-financial">
                          <FiMail className="mr-1 text-sm" /> Email
                        </button>
                        <button onClick={() => setExportModal('lender')} className="btn-financial">
                          <FiShare2 className="mr-1 text-sm" /> Share
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Alerts & Insights */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="financial-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-medium flex items-center gap-2 text-base">
                        <div className="w-5 h-5 bg-destructive rounded flex items-center justify-center">
                          <FiAlertCircle className="text-white text-xs" />
                        </div>
                        Credit Alerts
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PremiumAlerts user={user} maxItems={3} />
                    </CardContent>
                  </Card>
                  
                  <Card className="financial-card">
                    <CardHeader className="pb-3">
                      <CardTitle className="font-medium flex items-center gap-2 text-base">
                        <div className="w-5 h-5 bg-success rounded flex items-center justify-center">
                          <FiZap className="text-white text-xs" />
                        </div>
                        AI Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <PremiumInsights creditData={creditData} maxItems={3} />
                    </CardContent>
                  </Card>
                </div>
              </div>
              
              {/* Right Sidebar */}
              <div className="space-y-4">
                <Card className="financial-card">
                  <CardContent className="p-4">
                    <PremiumToolsPanel user={user} creditData={creditData} />
                  </CardContent>
                </Card>
                
                {/* Recent Activity */}
                <Card className="financial-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-medium flex items-center gap-2 text-base">
                      <div className="w-5 h-5 bg-primary rounded flex items-center justify-center">
                        <FiClock className="text-white text-xs" />
                      </div>
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RecentActivity activities={creditData?.recentActivities || []} />
                  </CardContent>
                </Card>
                
                {/* Improvement Tips */}
                <Card className="financial-card">
                  <CardHeader className="pb-3">
                    <CardTitle className="font-medium flex items-center gap-2 text-base">
                      <div className="w-5 h-5 bg-success rounded flex items-center justify-center">
                        <FiTarget className="text-white text-xs" />
                      </div>
                      Improvement Tips
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-3">
                      {creditData?.recommendations?.slice(0, 3).map((rec, idx) => (
                        <li key={idx} className="flex items-start gap-2 p-3 financial-card">
                          <FiStar className="text-warning mt-0.5 flex-shrink-0 text-sm" />
                          <span className="text-xs text-foreground">{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        }
      />
      
      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 xl:hidden flex justify-around items-center glass border-t border-card-border py-2">
        <button onClick={() => setOpenTool('score')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent">
          <FiBarChart2 className="text-sm" />
          <span className="text-xs">Tools</span>
        </button>
        <button onClick={() => setExportModal('email')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent">
          <FiDownload className="text-sm" />
          <span className="text-xs">Export</span>
        </button>
        <button onClick={() => handleOpen('profile')} className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-accent">
          <FiUser className="text-sm" />
          <span className="text-xs">Profile</span>
        </button>
      </nav>
      
      {/* Modals */}
      <Dialog open={modal === 'contact'} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="glass border-card-border">
          <DialogHeader><DialogTitle>Update Contact Info</DialogTitle></DialogHeader>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="mb-2 bg-input border-card-border" />
          <Input name="email" value={form.email} onChange={handleChange} placeholder="Email" className="mb-2 bg-input border-card-border" />
          <Input name="phone" value={form.phone} onChange={handleChange} placeholder="Phone" className="mb-2 bg-input border-card-border" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('contact')} disabled={loading} className="gradient-primary text-white">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'profile'} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="glass border-card-border">
          <DialogHeader><DialogTitle>View/Edit Profile</DialogTitle></DialogHeader>
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Name" className="mb-2 bg-input border-card-border" />
          <Input name="address" value={form.address} onChange={handleChange} placeholder="Address" className="mb-2 bg-input border-card-border" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('profile')} disabled={loading} className="gradient-primary text-white">
              {loading ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'dispute'} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="glass border-card-border">
          <DialogHeader><DialogTitle>Submit Score Dispute</DialogTitle></DialogHeader>
          <Input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="mb-2 bg-input border-card-border" />
          <Textarea name="message" value={form.message} onChange={handleChange} placeholder="Describe your dispute..." className="mb-2 bg-input border-card-border" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('dispute')} disabled={loading} className="gradient-primary text-white">
              {loading ? 'Submitting...' : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={modal === 'support'} onOpenChange={v => !v && handleClose()}>
        <DialogContent className="glass border-card-border">
          <DialogHeader><DialogTitle>Contact Support</DialogTitle></DialogHeader>
          <Input name="subject" value={form.subject} onChange={handleChange} placeholder="Subject" className="mb-2 bg-input border-card-border" />
          <Textarea name="message" value={form.message} onChange={handleChange} placeholder="How can we help you?" className="mb-2 bg-input border-card-border" />
          <DialogFooter>
            <Button onClick={() => handleSubmit('support')} disabled={loading} className="gradient-primary text-white">
              {loading ? 'Sending...' : 'Send'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Export Modals */}
      <Dialog open={exportModal === 'email'} onOpenChange={v => !v && setExportModal(null)}>
        <DialogContent className="glass border-card-border">
          <DialogHeader><DialogTitle>Send Report to Email</DialogTitle></DialogHeader>
          <Input name="email" value={exportEmail} onChange={e => setExportEmail(e.target.value)} placeholder="Enter your email" className="mb-2 bg-input border-card-border" />
          <DialogFooter>
            <Button onClick={handleSendEmail} className="gradient-primary text-white">Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={exportModal === 'lender'} onOpenChange={v => !v && setExportModal(null)}>
        <DialogContent className="glass border-card-border">
          <DialogHeader><DialogTitle>Share Score with Lender</DialogTitle></DialogHeader>
          <Input name="email" value={exportEmail} onChange={e => setExportEmail(e.target.value)} placeholder="Lender's email" className="mb-2 bg-input border-card-border" />
          <DialogFooter>
            <Button onClick={handleShareLender} className="gradient-primary text-white">Share</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Tool Modals */}
      <Dialog open={openTool === 'score'} onOpenChange={v => !v && setOpenTool(null)}>
        <DialogContent className="glass border-card-border">
          <DialogHeader><DialogTitle>Score Simulator</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-medium text-foreground">Payment History (%)</label>
              <Input name="paymentHistory" type="number" min="0" max="1" step="0.01" value={simInput.paymentHistory} onChange={handleSimChange} className="bg-input border-card-border" />
            </div>
            <div>
              <label className="block mb-2 text-sm font-medium text-foreground">Credit Utilization (%)</label>
              <Input name="utilization" type="number" min="0" max="1" step="0.01" value={simInput.utilization} onChange={handleSimChange} className="bg-input border-card-border" />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleScoreSim} className="gradient-primary text-white">Simulate</Button>
          </DialogFooter>
          {simResult && (
            <div className="mt-4 p-4 gradient-success rounded-lg border border-card-border">
              <div className="text-white font-medium">{simResult}</div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
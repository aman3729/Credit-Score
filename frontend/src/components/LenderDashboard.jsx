// src/components/LenderDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, 
  User, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  Info, 
  ChevronDown, 
  Edit, 
  Save, 
  AlertTriangle,
  BarChart4,
  Bell,
  FileText,
  Mail,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
  Loader2
} from 'lucide-react';
import axios from 'axios';
import AdminBatchUpload from './AdminBatchUpload';
import { Modal } from 'antd';
import EnhancedRegister from './EnhancedRegister';

// UI Components
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { useToast } from '../hooks/use-toast';
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

// Reasoning Components
import CreditInsights from './CreditInsights';
import ImprovementTipsEngine from './ImprovementTipsEngine';

const LenderDashboard = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout, user } = useAuth();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userCreditData, setUserCreditData] = useState(null);
  const [loadingCreditData, setLoadingCreditData] = useState(false);
  const [creditDataError, setCreditDataError] = useState(null);
  const [isEditingDecision, setIsEditingDecision] = useState(false);
  const [manualDecision, setManualDecision] = useState({
    decision: '',
    notes: '',
    amount: '',
    term: '',
    interestRate: ''
  });
  const [activeTab, setActiveTab] = useState('overview');
  const [dashboardMetrics, setDashboardMetrics] = useState({
    approvedLoans: 0,
    pendingLoans: 0,
    rejectedLoans: 0,
    avgDecisionTime: '0m',
    riskBreakdown: { low: 0, medium: 0, high: 0 }
  });
  const [alerts, setAlerts] = useState([]);
  const [recentDecisions, setRecentDecisions] = useState([]);
  const [loanOffer, setLoanOffer] = useState(null);
  const [loadingLoanOffer, setLoadingLoanOffer] = useState(false);
  const [sendingOffer, setSendingOffer] = useState(false);
  const [decliningOffer, setDecliningOffer] = useState(false);
  const [editingIncome, setEditingIncome] = useState(false);
  const [newIncome, setNewIncome] = useState('');
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [decisionData, setDecisionData] = useState(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [decisionError, setDecisionError] = useState(null);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  
  const searchTimeoutRef = useRef(null);
  const intervalRef = useRef(null);

  // Search users with debounce
  const searchUsers = useCallback(async (query = '') => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      const response = await api.get(`/lenders/search-borrowers?search=${encodeURIComponent(query)}`);
      const usersList = Array.isArray(response.data.data) ? response.data.data : [];
      setUsers(usersList);
    } catch (err) {
      console.error('Error searching users:', err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast({
          title: 'Session expired',
          description: 'Please log in again',
          variant: 'destructive',
        });
        logout();
        navigate('/login');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to search users',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, logout, toast]);

  // Handle search input with debounce
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query);
    }, 500);
  };

  // Fetch user credit data
  const fetchUserCreditData = async (userId) => {
    if (!userId) return;

    try {
      setLoadingCreditData(true);
      setCreditDataError(null);
      
      const response = await api.get(`/user/${userId}/credit-data`);
      const responseData = response.data.data || response.data;
      
      if (!responseData) throw new Error('No data received from server');
      
      // Always use the latest lending decision, falling back to the most recent in lendingDecisionHistory
      let latestLendingDecision = responseData.lendingDecision;
      if (
        (!latestLendingDecision || Object.keys(latestLendingDecision).length === 0 || latestLendingDecision.decision === undefined)
        && Array.isArray(responseData.lendingDecisionHistory)
        && responseData.lendingDecisionHistory.length > 0
      ) {
        latestLendingDecision = responseData.lendingDecisionHistory[responseData.lendingDecisionHistory.length - 1];
      }
      setUserCreditData({
        userId,
        ...responseData,
        currentScore: responseData.currentScore,
        lendingDecision: latestLendingDecision,
      });
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load credit data';
      setCreditDataError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoadingCreditData(false);
    }
  };

  // Handle user selection
  const handleUserSelect = async (user) => {
    setUserCreditData(null);
    setCreditDataError(null);
    setLoanOffer(null);
    setSelectedUser(user);
    setLoadingLoanOffer(true);

    try {
      const offerRes = await api.get(`/lenders/lending-decision/${user._id}`);
      if (offerRes.data?.data) setLoanOffer(offerRes.data.data);
      fetchUserCreditData(user._id);
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || err.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    } finally {
      setLoadingLoanOffer(false);
    }

    setActiveTab('borrower');
  };

  // Close borrower view
  const closeBorrowerView = useCallback(() => {
    setSelectedUser(null);
    setUserCreditData(null);
    setIsEditingDecision(false);
    setManualDecision({
      decision: '',
      notes: '',
      amount: '',
      term: '',
      interestRate: ''
    });
    setActiveTab('overview');
  }, []);

  // Fetch dashboard metrics
  const fetchDashboardMetrics = useCallback(async () => {
    try {
      const response = await api.get('/lenders/recent-decisions?limit=100');
      const decisions = response.data.data?.decisions || [];
      const approvedCount = decisions.filter(d => d.lendingDecision?.decision === 'Approve').length;
      const pendingCount = decisions.filter(d => d.lendingDecision?.decision === 'Review').length;
      const rejectedCount = decisions.filter(d => d.lendingDecision?.decision === 'Reject').length;
      
      setDashboardMetrics({
        approvedLoans: approvedCount,
        pendingLoans: pendingCount,
        rejectedLoans: rejectedCount,
        avgDecisionTime: '2.5m',
        riskBreakdown: { low: 35, medium: 45, high: 20 }
      });
    } catch (error) {
      setDashboardMetrics({
        approvedLoans: 0,
        pendingLoans: 0,
        rejectedLoans: 0,
        avgDecisionTime: '0m',
        riskBreakdown: { low: 0, medium: 0, high: 0 }
      });
    }
  }, []);

  // Fetch recent decisions
  const fetchRecentDecisions = useCallback(async () => {
    try {
      const response = await api.get('/lenders/recent-decisions?limit=5');
      setRecentDecisions(response.data.data?.decisions || []);
    } catch (error) {
      setRecentDecisions([]);
    }
  }, []);

  // Fetch alerts
  const fetchAlerts = useCallback(async () => {
    try {
      const decisions = await fetchRecentDecisions();
      const alerts = [];
      
      const highRiskCount = decisions.filter(d => 
        (d.creditScore?.fico?.score || 0) < 670
      ).length;
      
      if (highRiskCount > 2) {
        alerts.push({
          type: 'critical',
          title: 'High Risk Applications',
          description: `${highRiskCount} high-risk applications in recent decisions`,
          time: '2 hours ago'
        });
      }
      
      setAlerts(alerts);
    } catch (error) {
      setAlerts([]);
    }
  }, [fetchRecentDecisions]);

  // Save manual decision
  const saveManualDecision = async () => {
    if (!userCreditData?.userId) {
      toast({
        title: 'Error',
        description: 'No user selected for decision',
        variant: 'destructive',
      });
      return;
    }

    try {
      await api.post(`/lenders/save-decision/${userCreditData.userId}`, {
        ...manualDecision,
        isManual: true,
        reasons: userCreditData?.lendingDecision?.reasons || [],
        recommendations: userCreditData?.lendingDecision?.recommendations || [],
      });
      
      setUserCreditData(prev => ({
        ...prev,
        lendingDecision: {
          ...prev.lendingDecision,
          decision: manualDecision.decision,
          isManual: true,
          manualNotes: manualDecision.notes,
          loanDetails: {
            amount: manualDecision.amount,
            term: manualDecision.term,
            interestRate: manualDecision.interestRate
          }
        }
      }));
      
      setIsEditingDecision(false);
      toast({
        title: 'Success',
        description: 'Lending decision saved',
        variant: 'default',
      });
      fetchRecentDecisions();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save decision',
        variant: 'destructive',
      });
    }
  };

  // Start editing the decision
  const startEditingDecision = () => {
    setManualDecision({
      decision: userCreditData?.lendingDecision?.decision || 'Review',
      notes: userCreditData?.lendingDecision?.manualNotes || '',
      amount: userCreditData?.lendingDecision?.loanDetails?.amount || '',
      term: userCreditData?.lendingDecision?.loanDetails?.term || '',
      interestRate: userCreditData?.lendingDecision?.loanDetails?.interestRate || ''
    });
    setIsEditingDecision(true);
  };

  // Handler to submit new income and recalculate
  const submitNewIncome = async () => {
    if (!selectedUser) return;
    setRecalcLoading(true);
    try {
      const res = await api.post(`/lenders/lending-decision/${selectedUser._id}/recalculate`, {
        monthlyIncome: Number(newIncome)
      });
      if (res.data?.offer) {
        setLoanOffer(res.data.offer);
        toast({ title: 'Loan offer recalculated', description: `New offer based on income $${newIncome}` });
      }
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || err.message, 
        variant: 'destructive' 
      });
    } finally {
      setRecalcLoading(false);
      setEditingIncome(false);
    }
  };

  // Add sendOffer and declineOffer handlers
  const sendOffer = async () => {
    if (!selectedUser || !loanOffer) return;
    setSendingOffer(true);
    try {
      await api.post(`/lenders/save-decision/${selectedUser._id}`, {
        decision: 'Approve',
        notes: 'Offer sent to borrower',
        loanDetails: {
          amount: loanOffer.approvedAmount,
          term: loanOffer.termMonths,
          interestRate: loanOffer.interestRate
        },
        isManual: false
      });
      toast({ 
        title: 'Offer sent', 
        description: 'Loan offer sent to borrower.' 
      });
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || err.message, 
        variant: 'destructive' 
      });
    } finally {
      setSendingOffer(false);
    }
  };

  const declineOffer = async () => {
    if (!selectedUser || !loanOffer) return;
    setDecliningOffer(true);
    try {
      await api.post(`/lenders/save-decision/${selectedUser._id}`, {
        decision: 'Reject',
        notes: 'Offer declined by lender',
        isManual: false
      });
      toast({ 
        title: 'Offer declined', 
        description: 'Loan offer declined.' 
      });
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || err.message, 
        variant: 'destructive' 
      });
    } finally {
      setDecliningOffer(false);
    }
  };

  // New function to fetch decision by phone number
  const fetchDecisionByPhone = async (phone) => {
    setDecisionLoading(true);
    setDecisionError(null);
    setDecisionData(null);
    try {
      const res = await axios.get(`/api/creditScore/decision/${encodeURIComponent(phone)}`);
      setDecisionData(res.data);
    } catch (err) {
      setDecisionError(err.response?.data?.error || err.message || 'Failed to fetch decision');
    } finally {
      setDecisionLoading(false);
    }
  };

  // Add a search bar for phone number
  const handlePhoneSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    fetchDecisionByPhone(searchQuery.trim());
  };

  // Cleanup on unmount
  useEffect(() => {
    const currentTimeout = searchTimeoutRef.current;
    const currentInterval = intervalRef.current;
    
    return () => {
      if (currentTimeout) clearTimeout(currentTimeout);
      if (currentInterval) clearInterval(currentInterval);
    };
  }, []);

  // Fetch initial data
  useEffect(() => {
    fetchDashboardMetrics();
    fetchRecentDecisions();
    fetchAlerts();
    
    const interval = setInterval(() => {
      fetchDashboardMetrics();
      fetchRecentDecisions();
      fetchAlerts();
    }, 30000);
    
    intervalRef.current = interval;
    
    return () => clearInterval(interval);
  }, [fetchDashboardMetrics, fetchRecentDecisions, fetchAlerts]);

  // Render decision badge
  const renderDecisionBadge = (decision, size = 'default') => {
    const baseClasses = 'inline-flex items-center rounded-full text-xs font-medium';
    const sizeClasses = size === 'large' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
    const iconSize = size === 'large' ? 'h-4 w-4' : 'h-3 w-3';
    
    switch(decision?.toLowerCase()) {
      case 'approve':
        return <span className={`${baseClasses} ${sizeClasses} bg-green-100 text-green-800`}>
          <CheckCircle2 className={`${iconSize} mr-1`} />
          Approved
        </span>;
      case 'reject':
        return <span className={`${baseClasses} ${sizeClasses} bg-red-100 text-red-800`}>
          <XCircle className={`${iconSize} mr-1`} />
          Rejected
        </span>;
      case 'review':
      default:
        return <span className={`${baseClasses} ${sizeClasses} bg-yellow-100 text-yellow-800`}>
          <AlertCircle className={`${iconSize} mr-1`} />
          Review
        </span>;
    }
  };

  // Handle manual decision change
  const handleManualDecision = (field, value) => {
    setManualDecision(prev => ({ ...prev, [field]: value }));
  };

  // Render dashboard metrics
  const renderMetrics = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {[
        { 
          title: 'Approved Loans', 
          value: dashboardMetrics.approvedLoans, 
          icon: CheckCircle2, 
          color: 'green' 
        },
        { 
          title: 'Pending Loans', 
          value: dashboardMetrics.pendingLoans, 
          icon: Clock, 
          color: 'yellow' 
        },
        { 
          title: 'Rejected Loans', 
          value: dashboardMetrics.rejectedLoans, 
          icon: XCircle, 
          color: 'red' 
        },
        { 
          title: 'Avg. Decision Time', 
          value: dashboardMetrics.avgDecisionTime, 
          icon: BarChart4, 
          color: 'blue' 
        }
      ].map((metric, index) => (
        <Card key={index} className={`border-l-4 border-${metric.color}-500`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-muted-foreground">{metric.title}</p>
                <h3 className="text-2xl font-bold">{metric.value}</h3>
              </div>
              <div className={`bg-${metric.color}-100 p-3 rounded-full`}>
                <metric.icon className={`h-6 w-6 text-${metric.color}-600`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  // Render borrower snapshot
  const renderBorrowerSnapshot = () => (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle>Borrower Snapshot</CardTitle>
          <Button variant="outline" onClick={closeBorrowerView}>
            Back to Dashboard
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loadingCreditData ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : userCreditData ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Left Column - User Info */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-4 mb-6">
                <div className="bg-gray-100 p-3 rounded-full">
                  <User className="h-8 w-8 text-gray-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">{selectedUser?.name || 'N/A'}</h3>
                  <p className="text-muted-foreground">{selectedUser?.email || 'N/A'}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm text-muted-foreground">Credit Score</h4>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-3xl font-extrabold text-blue-700">{userCreditData.creditScore?.fico?.score ?? userCreditData.currentScore ?? 'N/A'}</span>
                    <Badge variant="outline">
                      {(() => {
                        const score = userCreditData.creditScore?.fico?.score ?? userCreditData.currentScore;
                        if (score >= 740) return 'Excellent';
                        if (score >= 670) return 'Good';
                        if (score >= 580) return 'Fair';
                        if (typeof score === 'number') return 'Poor';
                        return 'N/A';
                      })()}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm text-muted-foreground">Risk Assessment</h4>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {userCreditData.lendingDecision?.riskFlags?.highDTI && (
                      <Badge variant="destructive">High DTI</Badge>
                    )}
                    {userCreditData.lendingDecision?.riskFlags?.hasDefaults && (
                      <Badge variant="destructive">Defaults</Badge>
                    )}
                    {userCreditData.lendingDecision?.riskFlags?.hasMissedPayments && (
                      <Badge variant="warning">Missed Payments</Badge>
                    )}
                    {!userCreditData.lendingDecision?.riskFlags?.highDTI && 
                     !userCreditData.lendingDecision?.riskFlags?.hasDefaults && 
                     !userCreditData.lendingDecision?.riskFlags?.hasMissedPayments && (
                      <Badge variant="default">Low Risk</Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-sm text-muted-foreground">Lending Decision</h4>
                  <div className="mt-1">
                    {renderDecisionBadge(userCreditData.lendingDecision?.decision || 'Review', 'large')}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Right Column - Financial Metrics */}
            <div className="md:col-span-2">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { 
                    title: 'Monthly Income', 
                    value: userCreditData.monthlyIncome !== undefined && userCreditData.monthlyIncome !== null ? `$${userCreditData.monthlyIncome.toLocaleString()}` : 'N/A',
                    editable: true
                  },
                  { 
                    title: 'Total Debt', 
                    value: userCreditData.totalDebt !== undefined && userCreditData.totalDebt !== null ? `$${userCreditData.totalDebt.toLocaleString()}` : 'N/A'
                  },
                  { 
                    title: 'DTI Ratio', 
                    value: userCreditData.lendingDecision?.debtToIncomeRatio !== undefined && userCreditData.lendingDecision?.debtToIncomeRatio !== null
                      ? `${(userCreditData.lendingDecision.debtToIncomeRatio * 100).toFixed(1)}%` 
                      : 'N/A' 
                  },
                  { 
                    title: 'Max Loan Amount', 
                    value: userCreditData.lendingDecision?.maxLoanAmount !== undefined && userCreditData.lendingDecision?.maxLoanAmount !== null
                      ? `$${userCreditData.lendingDecision.maxLoanAmount.toLocaleString()}` : 'N/A',
                    highlight: true
                  },
                  { 
                    title: 'Suggested Rate', 
                    value: userCreditData.lendingDecision?.suggestedInterestRate !== undefined && userCreditData.lendingDecision?.suggestedInterestRate !== null
                      ? userCreditData.lendingDecision.suggestedInterestRate : 'N/A',
                    highlight: true
                  },
                  { 
                    title: 'Missed Payments', 
                    value: userCreditData.recentMissedPayments !== undefined && userCreditData.recentMissedPayments !== null ? userCreditData.recentMissedPayments : 0 
                  },
                  { 
                    title: 'Recent Defaults', 
                    value: userCreditData.recentDefaults !== undefined && userCreditData.recentDefaults !== null ? userCreditData.recentDefaults : 0 
                  },
                  { 
                    title: 'Credit Utilization', 
                    value: userCreditData.creditUtilization?.overall !== undefined && userCreditData.creditUtilization?.overall !== null
                      ? `${(userCreditData.creditUtilization.overall * 100).toFixed(1)}%` 
                      : 'N/A' 
                  },
                  { 
                    title: 'Credit Mix',
                    value: userCreditData.creditMix !== undefined && userCreditData.creditMix !== null
                      ? `${(userCreditData.creditMix * 100).toFixed(1)}%`
                      : 'N/A'
                  },
                  {
                    title: 'Credit Age (months)',
                    value: userCreditData.creditAgeMonths !== undefined && userCreditData.creditAgeMonths !== null
                      ? userCreditData.creditAgeMonths
                      : 'N/A'
                  },
                  {
                    title: 'Total Accounts',
                    value: userCreditData.totalAccounts !== undefined && userCreditData.totalAccounts !== null
                      ? userCreditData.totalAccounts
                      : 'N/A'
                  },
                  {
                    title: 'Open Accounts',
                    value: userCreditData.openAccounts !== undefined && userCreditData.openAccounts !== null
                      ? userCreditData.openAccounts
                      : 'N/A'
                  }
                ].map((metric, index) => (
                  <div 
                    key={index} 
                    className={`p-4 rounded-lg ${metric.highlight ? 'bg-blue-50' : 'bg-gray-50'}`}
                  >
                    <h4 className="text-sm text-muted-foreground">{metric.title}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <p className={`text-lg font-semibold ${metric.highlight ? 'text-blue-600' : ''}`}>
                        {metric.value}
                      </p>
                      {metric.editable && (
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={startEditingIncome}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No credit data available
          </div>
        )}
      </CardContent>
    </Card>
  );

  // Render borrower list
  const renderBorrowerList = () => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Borrower</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Credit Score</TableHead>
          <TableHead>Risk Level</TableHead>
          <TableHead>Decision</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {users.map((user) => (
          <TableRow key={user._id}>
            <TableCell>
              <div className="font-medium">{user.name || 'N/A'}</div>
              <div className="text-sm text-muted-foreground">{user.email || 'N/A'}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">
                {user.status || 'inactive'}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center">
                <CreditCard className="h-4 w-4 mr-2 text-muted-foreground" />
                {user.creditScore || 'N/A'}
              </div>
            </TableCell>
            <TableCell>
              <Badge variant={
                user.lendingDecision?.riskFlags?.highDTI || 
                user.lendingDecision?.riskFlags?.hasDefaults ? "destructive" : 
                user.lendingDecision?.riskFlags?.hasMissedPayments ? "warning" : "default"
              }>
                {user.lendingDecision?.riskFlags?.highDTI || 
                 user.lendingDecision?.riskFlags?.hasDefaults ? "High Risk" : 
                 user.lendingDecision?.riskFlags?.hasMissedPayments ? "Medium Risk" : "Low Risk"}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex items-center">
                {renderDecisionBadge(user.lendingDecision?.decision || 'Review')}
              </div>
            </TableCell>
            <TableCell>
              <Button size="sm" onClick={() => handleUserSelect(user)}>Review</Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  const startEditingIncome = () => setEditingIncome(true);

  const handleBatchUploadOpen = () => setShowBatchUpload(true);
  const handleBatchUploadClose = () => setShowBatchUpload(false);
  const handleBatchUploadComplete = (results) => {
    setBatchResults(results);
    setShowBatchUpload(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-950 dark:to-blue-950 min-h-screen rounded-xl shadow-lg transition-colors duration-300">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lender Dashboard</h1>
          <p className="text-muted-foreground dark:text-gray-400">Monitor applications and make lending decisions</p>
        </div>
        {/* Dark mode toggle button */}
        <button
          onClick={toggleDarkMode}
          className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200 self-end"
          aria-label="Toggle dark mode"
        >
          {darkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
          )}
        </button>
      </div>

      {/* Search Panel */}
      <Card className="mb-8 transition-shadow hover:shadow-2xl duration-200 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
        <CardHeader className="bg-muted p-4">
          <div className="flex flex-col md:flex-row gap-4 items-center">
            <div className="w-full">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search users by username or phone number..."
                  className="pl-10 w-full"
                  value={searchQuery}
                  onChange={handleSearch}
                />
              </div>
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <Button 
                variant="outline" 
                onClick={() => setSearchQuery('')}
                disabled={!searchQuery}
                className="transition-colors hover:bg-blue-100"
              >
                Clear
              </Button>
              <Button>
                <Search className="h-4 w-4 mr-2" />
                Search
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {users.length > 0 ? (
            <div className="overflow-x-auto">
              {renderBorrowerList()}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground">
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
              ) : (
                'No search results. Start typing to search for borrowers.'
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList className="grid grid-cols-3">
          <TabsTrigger value="overview">
            <BarChart4 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="borrower" disabled={!selectedUser}>
            <User className="h-4 w-4 mr-2" />
            Borrower
          </TabsTrigger>
          <TabsTrigger value="activity">
            <TrendingUp className="h-4 w-4 mr-2" />
            Activity
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Dashboard Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {renderMetrics()}
            
            {/* Risk Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Risk Portfolio Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { level: 'Low Risk', value: dashboardMetrics.riskBreakdown.low, color: 'green' },
                    { level: 'Medium Risk', value: dashboardMetrics.riskBreakdown.medium, color: 'yellow' },
                    { level: 'High Risk', value: dashboardMetrics.riskBreakdown.high, color: 'red' }
                  ].map((risk, index) => (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <span className={`text-sm font-medium text-${risk.color}-600`}>
                          {risk.level}
                        </span>
                        <span className="text-sm font-medium">{risk.value}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className={`bg-${risk.color}-600 h-2.5 rounded-full`} 
                          style={{ width: `${risk.value}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="space-y-6">
            {/* Alerts */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Alerts & Monitoring</CardTitle>
                  <Button variant="ghost" size="icon">
                    <Bell className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts.length > 0 ? alerts.map((alert, index) => (
                    <div key={index} className="flex items-start gap-3">
                      <div className={`p-2 rounded-full mt-1 ${alert.type === 'critical' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                        <AlertTriangle className={`h-4 w-4 ${alert.type === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />
                      </div>
                      <div>
                        <h4 className="font-medium">{alert.title}</h4>
                        <p className="text-sm text-muted-foreground">{alert.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{alert.time}</p>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No alerts at this time
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Recent Decisions */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Decisions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentDecisions.length > 0 ? recentDecisions.map((decision, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <h4 className="font-medium">{decision.user?.name || 'Unknown User'}</h4>
                        <p className="text-sm text-muted-foreground">
                          {decision.user?.email || 'No email'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {renderDecisionBadge(decision.lendingDecision?.decision || 'Review')}
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-4 text-muted-foreground">
                      No recent decisions
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      {activeTab === 'borrower' && selectedUser && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {renderBorrowerSnapshot()}
            
            {/* Credit Insights */}
            {userCreditData && (
              <Card>
                <CardHeader>
                  <CardTitle>Credit Insights</CardTitle>
                </CardHeader>
                <CardContent>
                  <CreditInsights 
                    creditData={userCreditData}
                  />
                </CardContent>
              </Card>
            )}
            
            {/* Improvement Tips */}
            {userCreditData && (
              <Card>
                <CardHeader>
                  <CardTitle>Improvement Recommendations</CardTitle>
                </CardHeader>
                <CardContent>
                  <ImprovementTipsEngine 
                    creditData={userCreditData}
                  />
                </CardContent>
              </Card>
            )}
          </div>
          
          <div className="space-y-6">
            {/* Lending Decision */}
            <Card>
              <CardHeader>
                <CardTitle>Lending Decision</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="flex items-center gap-3 mb-2">
                    {userCreditData?.lendingDecision?.decision === 'Approve' && (
                      <span className="text-2xl">✅</span>
                    )}
                    {userCreditData?.lendingDecision?.decision === 'Review' && (
                      <span className="text-2xl">🟠</span>
                    )}
                    {userCreditData?.lendingDecision?.decision === 'Reject' && (
                      <span className="text-2xl">❌</span>
                    )}
                    <span className="text-xl font-bold">
                      {userCreditData?.lendingDecision?.decision === 'Approve' ? 'Loan Approval Summary' :
                       userCreditData?.lendingDecision?.decision === 'Review' ? 'Loan Under Review' :
                       userCreditData?.lendingDecision?.decision === 'Reject' ? 'Loan Rejected' :
                       'No Lending Decision'}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Decision</span><br/>{userCreditData?.lendingDecision?.decision ?? 'N/A'}</div>
                    <div><span className="text-muted-foreground">Score</span><br/>{userCreditData?.lendingDecision?.score ?? 'N/A'}</div>
                    <div><span className="text-muted-foreground">Classification</span><br/>{userCreditData?.lendingDecision?.classification ?? 'N/A'}</div>
                    <div><span className="text-muted-foreground">Risk Tier</span><br/>{userCreditData?.lendingDecision?.riskTier ?? 'N/A'}{userCreditData?.lendingDecision?.riskTierLabel ? ` (${userCreditData.lendingDecision.riskTierLabel})` : ''}</div>
                    <div><span className="text-muted-foreground">Default Risk Estimate</span><br/>{userCreditData?.lendingDecision?.defaultRiskEstimate ?? 'N/A'}</div>
                    <div><span className="text-muted-foreground">Engine Version</span><br/>{userCreditData?.lendingDecision?.engineVersion ?? 'N/A'}</div>
                    <div><span className="text-muted-foreground">DTI</span><br/>{userCreditData?.lendingDecision?.dti ?? 'N/A'}</div>
                    <div><span className="text-muted-foreground">Timestamp</span><br/>{userCreditData?.lendingDecision?.timestamp ? new Date(userCreditData.lendingDecision.timestamp).toLocaleString() : 'N/A'}</div>
                    <div><span className="text-muted-foreground">Rejection Code</span><br/>{userCreditData?.lendingDecision?.rejectionCode ?? 'N/A'}</div>
                  </div>
                  {/* Scoring Details */}
                  <div>
                    <h4 className="font-medium mb-1">Scoring Details</h4>
                    <div className="text-sm text-muted-foreground">
                      <b>Recession Mode:</b> {userCreditData?.lendingDecision?.scoringDetails?.recessionMode ? 'Yes' : 'No'}<br/>
                      <b>AI Enabled:</b> {userCreditData?.lendingDecision?.scoringDetails?.aiEnabled ? 'Yes' : 'No'}
                    </div>
                  </div>
                  {/* Customer Profile */}
                  <div>
                    <h4 className="font-medium mb-1">Customer Profile</h4>
                    <div className="text-sm text-muted-foreground">
                      <b>Employment Status:</b> {userCreditData?.lendingDecision?.customerProfile?.employmentStatus ?? 'N/A'}<br/>
                      <b>Active Loans:</b> {userCreditData?.lendingDecision?.customerProfile?.activeLoans ?? 'N/A'}<br/>
                      <b>Last Delinquency:</b> {userCreditData?.lendingDecision?.customerProfile?.lastDelinquency ?? 'N/A'}
                    </div>
                  </div>
                  {/* Reasons */}
                  <div>
                    <h4 className="font-medium mb-1">Reasons</h4>
                    {userCreditData?.lendingDecision?.reasons && userCreditData.lendingDecision.reasons.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {userCreditData.lendingDecision.reasons.map((reason, idx) => (
                          <li key={idx}>{reason}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-muted-foreground">N/A</div>
                    )}
                  </div>
                  {/* Risk Flags */}
                  <div>
                    <h4 className="font-medium mb-1 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" /> Risk Flags
                    </h4>
                    {userCreditData?.lendingDecision?.riskFlags && userCreditData.lendingDecision.riskFlags.length > 0 ? (
                      <ul className="list-disc list-inside text-sm text-muted-foreground">
                        {userCreditData.lendingDecision.riskFlags.map((flag, idx) => (
                          <li key={idx}>{flag}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-muted-foreground">N/A</div>
                    )}
                  </div>
                  {/* Loan Offer */}
                  <div>
                    <h4 className="font-medium mb-1">Loan Offer</h4>
                    {userCreditData?.lendingDecision?.offer ? (
                      <div style={{ lineHeight: 2 }}>
                        <b>Max Loan Amount:</b> {userCreditData.lendingDecision.offer.maxAmount ?? 'N/A'}<br/>
                        <b>Available Terms:</b> {userCreditData.lendingDecision.offer.availableTerms?.join(', ') ?? 'N/A'}<br/>
                        <b>Interest Rate:</b> {userCreditData.lendingDecision.offer.interestRate ?? 'N/A'}%<br/>
                        <b>Sample Payment (for {userCreditData.lendingDecision.offer.sampleTerm} mo):</b> {userCreditData.lendingDecision.offer.samplePayment ?? 'N/A'}<br/>
                        <b>Collateral Required:</b> {userCreditData.lendingDecision.offer.collateralRequired ? 'Yes' : 'No'}<br/>
                        {/* Pricing Model */}
                        <b>Pricing Model:</b><br/>
                        &nbsp;&nbsp;Base Rate: {userCreditData.lendingDecision.offer.pricingModel?.baseRate ?? 'N/A'}%<br/>
                        &nbsp;&nbsp;DTI Adj.: {userCreditData.lendingDecision.offer.pricingModel?.adjustments?.dtiAdjustment ?? 'N/A'}%<br/>
                        &nbsp;&nbsp;Recession Adj.: {userCreditData.lendingDecision.offer.pricingModel?.adjustments?.recessionAdjustment ?? 'N/A'}%<br/>
                        &nbsp;&nbsp;Payment Adj.: {userCreditData.lendingDecision.offer.pricingModel?.adjustments?.paymentAdjustment ?? 'N/A'}%<br/>
                        &nbsp;&nbsp;Final Rate: {userCreditData.lendingDecision.offer.pricingModel?.finalRate ?? 'N/A'}%
                      </div>
                    ) : (
                      <div className="text-muted-foreground">No loan offer available for this user.</div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Loan Offer */}
            {userCreditData?.lendingDecision && (
              <Card style={{ marginBottom: 24 }}>
                <CardHeader>
                  <CardTitle>Loan Offer</CardTitle>
                </CardHeader>
                <CardContent>
                  {userCreditData.lendingDecision.recommendation || userCreditData.lendingDecision.maxLoanAmount ? (
                    <div style={{ lineHeight: 2 }}>
                      <b>Max Loan Amount:</b> {userCreditData.lendingDecision.recommendation?.maxLoanAmount ?? userCreditData.lendingDecision.maxLoanAmount ?? 'N/A'}<br/>
                      <b>Interest Rate:</b> {userCreditData.lendingDecision.recommendation?.interestRate ?? userCreditData.lendingDecision.interestRate ?? 'N/A'}<br/>
                      <b>Term (months):</b> {userCreditData.lendingDecision.recommendation?.termMonths ?? userCreditData.lendingDecision.termMonths ?? 'N/A'}<br/>
                      <b>Monthly Payment:</b> {userCreditData.lendingDecision.recommendation?.monthlyPayment ?? userCreditData.lendingDecision.monthlyPayment ?? 'N/A'}<br/>
                    </div>
                  ) : (
                    <div className="text-muted-foreground">No loan offer available for this user.</div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Phone Search */}
      <form onSubmit={handlePhoneSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <Input
          placeholder="Search by phone number..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ maxWidth: 240 }}
        />
        <Button type="submit" disabled={decisionLoading}>Search</Button>
      </form>
      {decisionLoading && <div>Loading decision...</div>}
      {decisionError && <div style={{ color: 'red' }}>{decisionError}</div>}
      {decisionData && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>API Debug: Full Decision Data</CardTitle>
          </CardHeader>
          <CardContent>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12 }}>{JSON.stringify(decisionData, null, 2)}</pre>
            <div style={{ marginTop: 16 }}>
              <b>User:</b> {decisionData.user}<br/>
              <b>Score:</b> {decisionData.score}<br/>
              <b>Decision:</b> {decisionData.decision}<br/>
              {decisionData.loanOffer && (
                <>
                  <b>Loan Offer:</b><br/>
                  &nbsp;&nbsp;Amount: {decisionData.loanOffer.amount}<br/>
                  &nbsp;&nbsp;Rate: {decisionData.loanOffer.rate}<br/>
                  &nbsp;&nbsp;Term: {decisionData.loanOffer.term}<br/>
                  &nbsp;&nbsp;Monthly Payment: {decisionData.loanOffer.monthlyPayment}<br/>
                </>
              )}
              <b>Risk Flags:</b> {decisionData.riskFlags?.length ? decisionData.riskFlags.join(', ') : 'None'}<br/>
              <b>Insight:</b> {decisionData.insight}<br/>
            </div>
          </CardContent>
        </Card>
      )}

      <Button onClick={handleBatchUploadOpen} style={{ marginBottom: 16 }}>Batch Upload Borrowers</Button>
      <Modal
        open={showBatchUpload}
        onCancel={handleBatchUploadClose}
        footer={null}
        title="Batch Upload Borrowers"
        width={700}
        destroyOnHidden
      >
        <AdminBatchUpload onClose={handleBatchUploadClose} onUploadComplete={handleBatchUploadComplete} />
      </Modal>
      {batchResults && (
        <Card style={{ marginBottom: 24 }}>
          <CardHeader>
            <CardTitle>Batch Upload Results</CardTitle>
          </CardHeader>
          <CardContent>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{JSON.stringify(batchResults, null, 2)}</pre>
          </CardContent>
        </Card>
      )}

      <Button onClick={() => setShowRegister(true)} style={{ marginBottom: 16 }}>Register New User</Button>
      <Modal
        open={showRegister}
        onCancel={() => setShowRegister(false)}
        footer={null}
        title="Register New User"
        width={600}
        destroyOnHidden
      >
        <EnhancedRegister onSuccess={() => setShowRegister(false)} onClose={() => setShowRegister(false)} isAdmin={true} />
      </Modal>
    </div>
  );
};

export default LenderDashboard;
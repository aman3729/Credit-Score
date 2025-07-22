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
  Loader2,
  Upload,
  UserPlus,
  Flag,
  CheckSquare,
  Square,
  Calculator,
  Shield,
  AlertOctagon,
  TrendingDown
} from 'lucide-react';
import axios from 'axios';
import AdminBatchUpload from './AdminBatchUpload';
import { Modal } from 'antd';
import EnhancedRegister from './EnhancedRegister';
import LoanDecisionStatus from './LoanDecisionStatus';
import BorrowerSnapshot from './LenderDashboard/BorrowerSnapshot.jsx';
import BorrowerList from './LenderDashboard/BorrowerList.jsx';
import MetricsPanel from './LenderDashboard/MetricsPanel.jsx';
import ManualDecisionForm from './LenderDashboard/ManualDecisionForm.jsx';
import BatchUploadDialog from './LenderDashboard/dialogs/BatchUploadDialog.jsx';
import RegisterUserDialog from './LenderDashboard/dialogs/RegisterUserDialog.jsx';
import {
  searchUsers,
  fetchUserCreditData,
  fetchDashboardMetrics,
  fetchRecentDecisions,
  fetchAlerts,
  manualRefresh
} from './LenderDashboard/utils.js';
import LoanSimulationPanel from './LenderDashboard/LoanSimulationPanel.jsx';
import AlertsPanel from './LenderDashboard/AlertsPanel.jsx';
import RecentDecisionsPanel from './LenderDashboard/RecentDecisionsPanel.jsx';

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
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { useToast } from '../hooks/use-toast';
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";
import RiskTierOverridePanel from './LenderDashboard/RiskTierOverridePanel.jsx';
import BatchUploadResults from './LenderDashboard/BatchUploadResults.jsx';
import DecisionBadge from './LenderDashboard/DecisionBadge.jsx';
import LendingDecisionDetails from './LenderDashboard/LendingDecisionDetails.jsx';


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
    interestRate: '',
    rejectionReason: '',
    flagForReview: false,
    reviewNote: '',
    riskTierOverride: '',
    overrideJustification: '',
    loanType: '' // Added loanType
  });
  
  // Loan simulation state
  const [loanSimulation, setLoanSimulation] = useState({
    amount: 10000,
    term: 36,
    rate: 8.5,
    monthlyPayment: 0,
    totalInterest: 0,
    apr: 0,
    dti: 0,
    autoReject: false
  });
  
  const [showLoanSimulation, setShowLoanSimulation] = useState(false);
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
  const [hasCollateral, setHasCollateral] = useState(false);
  const [collateralValue, setCollateralValue] = useState(0);

  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [batchResults, setBatchResults] = useState(null);
  const [showRegister, setShowRegister] = useState(false);
  
  const searchTimeoutRef = useRef(null);
  const intervalRef = useRef(null);

  const [refreshing, setRefreshing] = useState(false);

  // Production-ready polling with exponential backoff and intelligent intervals
  const [pollingState, setPollingState] = useState({
    isActive: false,
    lastError: null,
    consecutiveErrors: 0,
    baseInterval: 30000, // 30 seconds
    maxInterval: 300000, // 5 minutes
    currentInterval: 30000
  });



  // Search users with debounce
  const handleSearch = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query, setUsers, setLoading, toast, logout, navigate);
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
      
      console.log('DEBUG: API Response for user credit data:', {
        userId,
        hasLendingDecision: !!responseData.lendingDecision,
        lendingDecisionKeys: responseData.lendingDecision ? Object.keys(responseData.lendingDecision) : [],
        currentScore: responseData.currentScore,
        hasHistory: Array.isArray(responseData.lendingDecisionHistory),
        historyLength: responseData.lendingDecisionHistory?.length || 0
      });
      
      if (!responseData) throw new Error('No data received from server');
      
      // Always use the fresh lending decision from the API response
      // The API should generate a fresh decision, so we should always use responseData.lendingDecision
      let latestLendingDecision = responseData.lendingDecision;
      
      // Only fall back to history if the fresh decision is completely missing
      if (!latestLendingDecision || Object.keys(latestLendingDecision).length === 0) {
        console.warn('No fresh lending decision found, falling back to history');
        if (Array.isArray(responseData.lendingDecisionHistory) && responseData.lendingDecisionHistory.length > 0) {
          latestLendingDecision = responseData.lendingDecisionHistory[responseData.lendingDecisionHistory.length - 1];
          console.warn('Using historical lending decision:', latestLendingDecision);
        }
      } else {
        console.log('Using fresh lending decision:', latestLendingDecision);
      }
      
      const userData = {
        userId,
        ...responseData,
        currentScore: responseData.currentScore,
        lendingDecision: latestLendingDecision,
      };
      
      setUserCreditData(userData);
      
      // Also update loan offer to ensure consistency
      if (latestLendingDecision) {
        setLoanOffer(latestLendingDecision);
      }
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
      // Fetch user credit data - it should contain the fresh lending decision
      await fetchUserCreditData(user._id);
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
      interestRate: '',
      rejectionReason: '',
      flagForReview: false,
      reviewNote: '',
      riskTierOverride: '',
      overrideJustification: '',
      loanType: ''
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
      return response.data.data?.decisions || [];
    } catch (error) {
      return [];
    }
  }, []);

  // Fetch alerts, now accepts recentDecisions as argument
  const fetchAlerts = useCallback(async (recentDecisions) => {
    try {
      const alerts = [];
      const highRiskCount = recentDecisions.filter(d => 
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
  }, []);

  // Manual refresh function for user-initiated updates
  const manualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardMetrics();
      const recentDecisions = await fetchRecentDecisions();
      setRecentDecisions(recentDecisions);
      await fetchAlerts(recentDecisions);
      toast({
        title: 'Refreshed',
        description: 'Latest data has been refreshed',
        variant: 'default'
      });
    } catch (error) {
      toast({
        title: 'Refresh Failed',
        description: error.response?.data?.error || 'Failed to refresh data',
        variant: 'destructive'
      });
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardMetrics, fetchRecentDecisions, fetchAlerts, toast]);

  // Intelligent polling based on user activity and errors
  const startPolling = useCallback(() => {
    if (pollingState.isActive) return;
    setPollingState(prev => ({ ...prev, isActive: true }));
    const poll = async () => {
      try {
        if (document.visibilityState === 'visible') {
          await fetchDashboardMetrics();
          const recentDecisions = await fetchRecentDecisions();
          setRecentDecisions(recentDecisions);
          await fetchAlerts(recentDecisions);
          setPollingState(prev => ({
            ...prev,
            consecutiveErrors: 0,
            currentInterval: prev.baseInterval,
            lastError: null
          }));
        }
      } catch (error) {
        console.warn('Polling error:', error);
        setPollingState(prev => {
          const newErrorCount = prev.consecutiveErrors + 1;
          const isRateLimit = error.response?.status === 429;
          const backoffMultiplier = isRateLimit ? Math.pow(2, newErrorCount) : newErrorCount;
          const newInterval = Math.min(
            prev.baseInterval * backoffMultiplier,
            prev.maxInterval
          );
          return {
            ...prev,
            consecutiveErrors: newErrorCount,
            currentInterval: newInterval,
            lastError: error,
            isActive: newErrorCount < 10
          };
        });
      }
    };
    poll();
    const interval = setInterval(() => {
      if (!pollingState.isActive) {
        clearInterval(interval);
        return;
      }
      poll();
    }, pollingState.currentInterval);
    return () => clearInterval(interval);
  }, [pollingState.isActive, pollingState.currentInterval, fetchDashboardMetrics, fetchRecentDecisions, fetchAlerts]);

  // Handle visibility change to pause/resume polling
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Resume polling when tab becomes visible
        if (!pollingState.isActive) {
          startPolling();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pollingState.isActive, startPolling]);

  // Start polling when component mounts
  useEffect(() => {
    const cleanup = startPolling();
    return cleanup;
  }, [startPolling]);

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
        decision: manualDecision.decision,
        notes: manualDecision.notes,
        isManual: true,
        reasons: userCreditData?.lendingDecision?.reasons || [],
        recommendations: userCreditData?.lendingDecision?.recommendations || [],
        loanDetails: {
          amount: manualDecision.amount,
          term: manualDecision.term,
          interestRate: manualDecision.interestRate
        },
        loanType: manualDecision.loanType, // <-- add this line
        rejectionReason: manualDecision.rejectionReason,
        flagForReview: manualDecision.flagForReview,
        reviewNote: manualDecision.reviewNote,
        riskTierOverride: manualDecision.riskTierOverride,
        overrideJustification: manualDecision.overrideJustification
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
          },
          loanType: manualDecision.loanType, // <-- add this line
          rejectionReason: manualDecision.rejectionReason,
          flagForReview: manualDecision.flagForReview,
          reviewNote: manualDecision.reviewNote,
          riskTierOverride: manualDecision.riskTierOverride,
          overrideJustification: manualDecision.overrideJustification
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
    console.log('startEditingDecision called', { userCreditData });
    setManualDecision({
      decision: userCreditData?.lendingDecision?.decision || 'Review',
      notes: userCreditData?.lendingDecision?.manualNotes || '',
      amount: userCreditData?.lendingDecision?.loanDetails?.amount || '',
      term: userCreditData?.lendingDecision?.loanDetails?.term || '',
      interestRate: userCreditData?.lendingDecision?.loanDetails?.interestRate || '',
      rejectionReason: userCreditData?.lendingDecision?.rejectionReason || '',
      flagForReview: userCreditData?.lendingDecision?.flagForReview || false,
      reviewNote: userCreditData?.lendingDecision?.reviewNote || '',
      riskTierOverride: userCreditData?.lendingDecision?.riskTierOverride || '',
      overrideJustification: userCreditData?.lendingDecision?.overrideJustification || '',
      loanType: userCreditData?.lendingDecision?.loanType || '' // Add loanType to manualDecision
    });
    setIsEditingDecision(true);
    console.log('isEditingDecision set to true');
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

  // Handler to recalculate with collateral
  const recalculateWithCollateral = async () => {
    if (!selectedUser) return;
    setRecalcLoading(true);
    try {
      const res = await api.post(`/lenders/lending-decision/${selectedUser._id}/recalculate`, {
        collateralValue: hasCollateral ? Number(collateralValue) : 0
      });
      if (res.data?.offer) {
        setLoanOffer(res.data.offer);
        toast({ 
          title: 'Loan offer recalculated', 
          description: hasCollateral 
            ? `New offer with collateral value $${collateralValue.toLocaleString()}` 
            : 'New offer without collateral' 
        });
      }
    } catch (err) {
      toast({ 
        title: 'Error', 
        description: err.response?.data?.error || err.message, 
        variant: 'destructive' 
      });
    } finally {
      setRecalcLoading(false);
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

  // Handle decision actions from LoanDecisionStatus component
  const handleDecisionAction = async (action) => {
    if (!selectedUser) return;

    try {
      switch (action) {
        case 'approve':
          await api.post(`/lenders/save-decision/${selectedUser._id}`, {
            decision: 'Approve',
            notes: 'Final offer approved by lender',
            isManual: true
          });
          toast({ 
            title: 'Offer Approved', 
            description: 'Final offer has been approved.' 
          });
          break;

        case 'edit':
          // Trigger edit mode for loan offer
          setIsEditingDecision(true);
          toast({ 
            title: 'Edit Mode', 
            description: 'You can now edit the loan offer terms.' 
          });
          break;

        case 'download':
          // Generate and download PDF
          toast({ 
            title: 'Download Started', 
            description: 'PDF summary is being generated...' 
          });
          // Here you would implement PDF generation
          break;

        case 'send':
          await sendOffer();
          break;

        case 'decline':
          await declineOffer();
          break;

        case 'hold':
          await api.post(`/lenders/save-decision/${selectedUser._id}`, {
            decision: 'Hold',
            notes: 'Application put on hold by lender',
            isManual: true
          });
          toast({ 
            title: 'Application on Hold', 
            description: 'Application has been put on hold.' 
          });
          break;

        default:
          break;
      }
    } catch (error) {
      toast({ 
        title: 'Error', 
        description: error.response?.data?.error || error.message, 
        variant: 'destructive' 
      });
    }
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
  // Initialize dashboard data (no polling - handled by startPolling)
  useEffect(() => {
    fetchDashboardMetrics();
    fetchRecentDecisions();
    fetchAlerts();
  }, []); // Only run once on mount

  // Handle manual decision change
  const handleManualDecision = (field, value) => {
    setManualDecision(prev => ({ ...prev, [field]: value }));
  };

  // Calculate loan payments and metrics
  const calculateLoanMetrics = (amount, term, rate, monthlyIncome = 0) => {
    const monthlyRate = rate / 100 / 12;
    const numberOfPayments = term;
    
    if (monthlyRate === 0) {
      return {
        monthlyPayment: amount / numberOfPayments,
        totalInterest: 0,
        apr: rate
      };
    }
    
    const monthlyPayment = (amount * monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments)) / 
                          (Math.pow(1 + monthlyRate, numberOfPayments) - 1);
    
    const totalInterest = (monthlyPayment * numberOfPayments) - amount;
    const apr = rate; // Simplified APR calculation
    
    // Calculate DTI
    const dti = monthlyIncome > 0 ? (monthlyPayment / monthlyIncome) * 100 : 0;
    const autoReject = dti > 60;
    
    return {
      monthlyPayment,
      totalInterest,
      apr,
      dti,
      autoReject
    };
  };

  // Update loan simulation when values change
  const updateLoanSimulation = (field, value) => {
    const newSimulation = { ...loanSimulation, [field]: value };
    const monthlyIncome = userCreditData?.monthlyIncome || 0;
    const metrics = calculateLoanMetrics(newSimulation.amount, newSimulation.term, newSimulation.rate, monthlyIncome);
    
    setLoanSimulation({
      ...newSimulation,
      ...metrics
    });
  };

  // Initialize loan simulation when user data is loaded
  useEffect(() => {
    if (userCreditData) {
      const monthlyIncome = userCreditData.monthlyIncome || 0;
      const metrics = calculateLoanMetrics(loanSimulation.amount, loanSimulation.term, loanSimulation.rate, monthlyIncome);
      setLoanSimulation(prev => ({
        ...prev,
        ...metrics
      }));
    }
  }, [userCreditData]);

  // Log DTI override when auto-reject is triggered
  const logDTIOverride = async () => {
    if (loanSimulation.autoReject && userCreditData?.userId) {
      try {
        await api.post(`/lenders/save-decision/${userCreditData.userId}`, {
          decision: 'Review',
          notes: `DTI Override: ${loanSimulation.dti.toFixed(1)}% DTI exceeds 60% threshold. Manual override required.`,
          isManual: true,
          reasons: ['DTI ratio exceeds standard threshold'],
          recommendations: ['Requires senior underwriter approval'],
          loanDetails: {
            amount: loanSimulation.amount,
            term: loanSimulation.term,
            interestRate: loanSimulation.rate
          },
          flagForReview: true,
          reviewNote: `High DTI ratio (${loanSimulation.dti.toFixed(1)}%) requires manual review and override.`
        });
        
        toast({
          title: "DTI Override Logged",
          description: "High DTI ratio has been logged for manual review.",
          variant: "default",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to log DTI override.",
          variant: "destructive",
        });
      }
    }
  };

  // Derived values for metrics
  const totalLoans = dashboardMetrics.approvedLoans + dashboardMetrics.pendingLoans + dashboardMetrics.rejectedLoans;
  const approvalRate = totalLoans > 0 ? ((dashboardMetrics.approvedLoans / totalLoans) * 100).toFixed(1) : 0;

  // Render dashboard metrics
  const renderMetrics = () => {
    const totalLoans = dashboardMetrics.approvedLoans + dashboardMetrics.pendingLoans + dashboardMetrics.rejectedLoans;
    const approvalRate = totalLoans > 0 ? ((dashboardMetrics.approvedLoans / totalLoans) * 100).toFixed(1) : 0;
    
    return (
      <div className="space-y-6 mb-8">
        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              title: 'Approved Loans', 
              value: dashboardMetrics.approvedLoans, 
              icon: CheckCircle2, 
              color: 'emerald',
              bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
              iconColor: 'text-emerald-600 dark:text-emerald-400',
              borderColor: 'border-emerald-200 dark:border-emerald-800',
              trend: '+12%',
              trendColor: 'text-emerald-600'
            },
            { 
              title: 'Pending Loans', 
              value: dashboardMetrics.pendingLoans, 
              icon: Clock, 
              color: 'amber',
              bgColor: 'bg-amber-50 dark:bg-amber-950/30',
              iconColor: 'text-amber-600 dark:text-amber-400',
              borderColor: 'border-amber-200 dark:border-amber-800',
              trend: '-5%',
              trendColor: 'text-amber-600'
            },
            { 
              title: 'Rejected Loans', 
              value: dashboardMetrics.rejectedLoans, 
              icon: XCircle, 
              color: 'red',
              bgColor: 'bg-red-50 dark:bg-red-950/30',
              iconColor: 'text-red-600 dark:text-red-400',
              borderColor: 'border-red-200 dark:border-red-800',
              trend: '-8%',
              trendColor: 'text-red-600'
            },
            { 
              title: 'Avg. Decision Time', 
              value: dashboardMetrics.avgDecisionTime, 
              icon: BarChart4, 
              color: 'blue',
              bgColor: 'bg-blue-50 dark:bg-blue-950/30',
              iconColor: 'text-blue-600 dark:text-blue-400',
              borderColor: 'border-blue-200 dark:border-blue-800',
              trend: '-15%',
              trendColor: 'text-blue-600'
            }
          ].map((metric, index) => (
            <Card 
              key={index} 
              className={`group hover:shadow-lg transition-all duration-300 ease-in-out border ${metric.borderColor} dark:bg-[#18191a] hover:scale-105`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`p-3 rounded-xl ${metric.bgColor} border ${metric.borderColor}`}>
                    <metric.icon className={`h-6 w-6 ${metric.iconColor}`} />
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium ${metric.trendColor}`}>
                      {metric.trend}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {metric.value}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    {metric.title}
                  </p>
                </div>
                
                {/* Progress indicator for loans */}
                {metric.title.includes('Loans') && totalLoans > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Portfolio Share</span>
                      <span>{((metric.value / totalLoans) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-500 ${
                          metric.color === 'emerald' ? 'bg-emerald-500' :
                          metric.color === 'amber' ? 'bg-amber-500' :
                          metric.color === 'red' ? 'bg-red-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${((metric.value / totalLoans) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Summary Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/30 dark:to-green-950/30 border-emerald-200 dark:border-emerald-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-emerald-700 dark:text-emerald-300">Approval Rate</h4>
                  <p className="text-3xl font-bold text-emerald-800 dark:text-emerald-200">
                    {approvalRate}%
                  </p>
                </div>
                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-full">
                  <TrendingUp className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border-blue-200 dark:border-blue-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300">Total Applications</h4>
                  <p className="text-3xl font-bold text-blue-800 dark:text-blue-200">
                    {totalLoans}
                  </p>
                </div>
                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full">
                  <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 border-purple-200 dark:border-purple-800">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-medium text-purple-700 dark:text-purple-300">Efficiency Score</h4>
                  <p className="text-3xl font-bold text-purple-800 dark:text-purple-200">
                    {totalLoans > 0 ? Math.round((dashboardMetrics.approvedLoans / totalLoans) * 100) : 0}
                  </p>
                </div>
                <div className="p-3 bg-purple-100 dark:bg-purple-900/50 rounded-full">
                  <BarChart4 className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

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
                <DecisionBadge decision={user.lendingDecision?.decision || 'Review'} />
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
    <div className="container mx-auto px-4 py-8 dark:bg-[#18191a] min-h-screen rounded-xl shadow-lg transition-colors duration-300">
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Lender Dashboard</h1>
          <p className="text-muted-foreground dark:text-gray-400">Monitor applications and make lending decisions</p>
        </div>
        <div className="header-actions">
          {/* Action Buttons */}
          <div className="btn-group">
            <Button
              onClick={manualRefresh}
              variant="outline"
              className="btn-secondary lender-action-btn flex items-center gap-2"
              disabled={pollingState.consecutiveErrors >= 10}
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
              {pollingState.consecutiveErrors > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">
                  {pollingState.consecutiveErrors}
                </Badge>
              )}
            </Button>
            <Button
              onClick={handleBatchUploadOpen}
              variant="outline"
              className="btn-secondary lender-action-btn flex items-center gap-2"
            >
              <Upload className="h-4 w-4" />
              Batch Upload
            </Button>
            <Button
              onClick={() => setShowRegister(true)}
              className="btn-primary lender-action-btn flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Register User
            </Button>
          </div>
          {/* Dark mode toggle button */}
          <button
            onClick={toggleDarkMode}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors duration-200"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-800" fill="currentColor" viewBox="0 0 24 24"><path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
        </div>
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
              <BorrowerList
                users={users}
                handleUserSelect={handleUserSelect}
                renderDecisionBadge={DecisionBadge}
              />
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
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="overview">
            <BarChart4 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="borrower" disabled={!selectedUser}>
            <User className="h-4 w-4 mr-2" />
            Borrower
          </TabsTrigger>
          <TabsTrigger value="decision" disabled={!selectedUser}>
            <FileText className="h-4 w-4 mr-2" />
            Loan Decision
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
            <MetricsPanel
              dashboardMetrics={dashboardMetrics}
              totalLoans={totalLoans}
              approvalRate={approvalRate}
            />
            
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
            <AlertsPanel alerts={alerts} />
            
            {/* Recent Decisions */}
            <RecentDecisionsPanel recentDecisions={recentDecisions} />
          </div>
        </div>
      )}
      
      {activeTab === 'borrower' && selectedUser && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <BorrowerSnapshot
              userCreditData={userCreditData}
              selectedUser={selectedUser}
              closeBorrowerView={closeBorrowerView}
              loadingCreditData={loadingCreditData}
              startEditingIncome={startEditingIncome}
              renderDecisionBadge={DecisionBadge}
            />
            

          </div>
          
          <div className="space-y-6">
            {/* Loan Decision Status Component */}
            <LoanDecisionStatus
              decision={userCreditData?.lendingDecision}
              loanOffer={userCreditData?.lendingDecision?.offer || loanOffer}
              onDecisionAction={handleDecisionAction}
              isLender={true}
            />
            
            {/* Complete Lending Decision Details */}
            {userCreditData?.lendingDecision && (
              <LendingDecisionDetails lendingDecision={userCreditData.lendingDecision} />
            )}
            
            {/* Debug info */}
            {!userCreditData && (
              <div className="text-xs text-gray-500 p-2 bg-gray-100 rounded">
                Debug: userCreditData is null, selectedUser: {selectedUser?.name || 'none'}
              </div>
            )}
            
            {/* Decision Outcome Controls */}
            {userCreditData && (
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Decision Outcome Controls</CardTitle>
                    <div className="text-xs text-gray-500">Debug: userCreditData exists, isEditingDecision: {isEditingDecision.toString()}</div>
                    {!isEditingDecision ? (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => {
                          console.log('Edit Decision button clicked');
                          startEditingDecision();
                        }}
                        className="flex items-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Edit Decision
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent>
                  {!isEditingDecision ? (
                    // Display current decision
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <span className="font-medium">Current Decision:</span>
                        <DecisionBadge decision={userCreditData?.lendingDecision?.decision || 'Review'} />
                      </div>
                      {userCreditData?.lendingDecision?.manualNotes && (
                        <div>
                          <span className="font-medium">Notes:</span>
                          <p className="text-sm text-muted-foreground mt-1">
                            {userCreditData.lendingDecision.manualNotes}
                          </p>
                        </div>
                      )}
                      {userCreditData?.lendingDecision?.flagForReview && (
                        <div className="flex items-center gap-2 text-yellow-600">
                          <Flag className="h-4 w-4" />
                          <span className="text-sm font-medium">Flagged for Manual Review</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <ManualDecisionForm
                      manualDecision={manualDecision}
                      handleManualDecision={handleManualDecision}
                      setIsEditingDecision={setIsEditingDecision}
                      saveManualDecision={saveManualDecision}
                      recalcLoading={recalcLoading}
                      hasCollateral={hasCollateral}
                      setHasCollateral={setHasCollateral}
                      collateralValue={collateralValue}
                      setCollateralValue={setCollateralValue}
                      recalculateWithCollateral={recalculateWithCollateral}
                      maxLoanAmount={userCreditData?.lendingDecision?.maxOffer || loanOffer?.maxOffer || 0}
                    />
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Risk Tier Override */}
            {userCreditData && (
              <RiskTierOverridePanel
                userCreditData={userCreditData}
                isEditingDecision={isEditingDecision}
                manualDecision={manualDecision}
                handleManualDecision={handleManualDecision}
                user={user}
              />
            )}
            
            {/* Loan Offer Simulation */}
            {userCreditData && (
              <LoanSimulationPanel
                loanSimulation={loanSimulation}
                setLoanSimulation={setLoanSimulation}
                showLoanSimulation={showLoanSimulation}
                setShowLoanSimulation={setShowLoanSimulation}
                updateLoanSimulation={updateLoanSimulation}
                handleManualDecision={handleManualDecision}
                toast={toast}
                userCreditData={userCreditData}
                logDTIOverride={logDTIOverride}
              />
            )}
            
          </div>
        </div>
      )}

      {/* New Decision Tab */}
      {activeTab === 'decision' && selectedUser && (
        <div className="space-y-6">
          <LoanDecisionStatus
            decision={userCreditData?.lendingDecision}
            loanOffer={userCreditData?.lendingDecision?.offer || loanOffer}
            onDecisionAction={handleDecisionAction}
            isLender={true}
          />
        </div>
      )}



      {/* Batch Upload Modal */}
      <BatchUploadDialog
        showBatchUpload={showBatchUpload}
        handleBatchUploadClose={handleBatchUploadClose}
        handleBatchUploadComplete={handleBatchUploadComplete}
        toast={toast}
      />
      {batchResults && (
        <BatchUploadResults batchResults={batchResults} />
      )}

      {/* Register User Modal */}
      <RegisterUserDialog
        showRegister={showRegister}
        setShowRegister={setShowRegister}
        toast={toast}
      />
    </div>
  );
};

export default LenderDashboard;
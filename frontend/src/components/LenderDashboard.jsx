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
  TrendingDown,
  Sparkles,
  Activity,
  DollarSign,
  Users,
  Target,
  Settings
} from 'lucide-react';

import LoanDecisionStatus from './LoanDecisionStatus';
import AlertsPanel from './LenderDashboard/AlertsPanel.jsx';
import RecentDecisionsPanel from './LenderDashboard/RecentDecisionsPanel.jsx';
import Header from './LenderDashboard/Header.jsx';
import SearchPanel from './LenderDashboard/SearchPanel.jsx';
import RiskTierOverridePanel from './LenderDashboard/RiskTierOverridePanel.jsx';
import BatchUploadResults from './LenderDashboard/BatchUploadResults.jsx';
import DecisionBadge from './LenderDashboard/DecisionBadge.jsx';
import LendingDecisionDetails from './LenderDashboard/LendingDecisionDetails.jsx';
import DecisionConfigPanel from './LenderDashboard/DecisionConfigPanel.jsx';
import ManualDecisionForm from './LenderDashboard/ManualDecisionForm.jsx';
import BatchUploadDialog from './LenderDashboard/dialogs/BatchUploadDialog.jsx';
import RegisterUserDialog from './LenderDashboard/dialogs/RegisterUserDialog.jsx';
import {
  fetchDashboardMetrics,
  fetchRecentDecisions,
  fetchAlerts,
  manualRefresh,
  searchUsers
} from './LenderDashboard/utils.js';

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
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import BorrowerSnapshot from './LenderDashboard/BorrowerSnapshot.jsx';

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
    loanType: ''
  });
  
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

  // Polling state
  const [pollingState, setPollingState] = useState({
    isActive: false,
    lastError: null,
    consecutiveErrors: 0,
    baseInterval: 30000, // 30 seconds
    maxInterval: 300000, // 5 minutes
    currentInterval: 30000
  });

  // Cleanup pending debounced search on unmount (prevents stray requests after Fast Refresh/remounts)
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Search users with debounce
  const handleSearch = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query, setUsers, setLoading, toast, logout, navigate);
    }, 500);
  }, [toast, logout, navigate]);

  // Immediate search trigger (used by Search button)
  const handleSearchSubmit = useCallback(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    const query = searchQuery;
    if (!query) {
      setUsers([]);
      return;
    }
    searchUsers(query, setUsers, setLoading, toast, logout, navigate);
  }, [searchQuery, toast, logout, navigate]);

  // Fetch user credit data and normalize decision/offer
  const fetchUserCreditDataInline = useCallback(async (userId) => {
    if (!userId) return;
    try {
      setLoadingCreditData(true);
      setCreditDataError(null);
      const response = await api.get(`/user/${userId}/credit-data`);
      const responseData = response.data.data || response.data;
      if (!responseData) throw new Error('No data received from server');
      
      const hasUsefulFields = (d) => !!(d && (d.decision || d.maxLoanAmount || d.suggestedInterestRate || d.loanDetails));
      let latest = responseData.lendingDecision;
      if (!hasUsefulFields(latest)) {
        const history = Array.isArray(responseData.lendingDecisionHistory) ? responseData.lendingDecisionHistory : [];
        latest = [...history].reverse().find(hasUsefulFields) || latest;
      }

      const computeNormalizedDti = () => {
        const sr = responseData.scoreResult || {};
        if (typeof sr.dtiRatio === 'number') return sr.dtiRatio;
        if (typeof sr.dti === 'number') return sr.dti;
        if (typeof sr.dti === 'string') {
          const val = parseFloat(sr.dti);
          if (!isNaN(val)) return val > 1 ? val / 100 : val;
        }
        if (typeof responseData.dti === 'number') return responseData.dti;
        return typeof latest?.dti === 'number' ? latest.dti : undefined;
      };

      const normalizedDecision = {
        ...latest,
        classification: latest?.classification || responseData.scoreResult?.classification || latest?.riskLabel,
        dti: computeNormalizedDti(),
        score: latest?.score || responseData.scoreResult?.score || responseData.currentScore,
        engineVersion: latest?.engineVersion || responseData.scoreResult?.version,
        // Derive missing risk fields from score if backend omitted them
        ...((() => {
          const score = (latest?.score ?? responseData.scoreResult?.score ?? responseData.currentScore);
          let derived = {};
          if (!latest?.riskTier || !latest?.riskTierLabel || !latest?.defaultRiskEstimate) {
            if (typeof score === 'number') {
              if (score >= 800) derived = { riskTier: 'Low Risk', riskTierLabel: 'Prime', defaultRiskEstimate: 'Very Low' };
              else if (score >= 740) derived = { riskTier: 'Low Risk', riskTierLabel: 'Prime', defaultRiskEstimate: 'Low' };
              else if (score >= 670) derived = { riskTier: 'Moderate Risk', riskTierLabel: 'Near Prime', defaultRiskEstimate: 'Moderate' };
              else if (score >= 580) derived = { riskTier: 'High Risk', riskTierLabel: 'Subprime', defaultRiskEstimate: 'High' };
              else derived = { riskTier: 'Very High Risk', riskTierLabel: 'Deep Subprime', defaultRiskEstimate: 'Very High' };
            }
          }
          return derived;
        })()),
        // Ensure dtiRating is present
        ...((() => {
          const dtiVal = computeNormalizedDti();
          if (!latest?.dtiRating && typeof dtiVal === 'number') {
            const rating = dtiVal <= 0.35 ? 'Low' : dtiVal <= 0.45 ? 'Medium' : 'High';
            return { dtiRating: rating };
          }
          return {};
        })()),
        customerProfile: {
          ...(latest?.customerProfile || {}),
          employmentStatus: (latest?.customerProfile && latest.customerProfile.employmentStatus)
            || responseData.scoreResult?.customerProfile?.employmentStatus
        }
      };

      const normalizedOffer = latest ? {
        amount: (
          (latest.loanDetails && parseFloat(latest.loanDetails.amount)) ||
          latest.maxLoanAmount ||
          latest.offer?.maxAmount ||
          null
        ),
        interestRate: (
          (latest.loanDetails && parseFloat(latest.loanDetails.interestRate)) ||
          latest.suggestedInterestRate ||
          latest.offer?.interestRate ||
          null
        ),
        termMonths: (
          (latest.loanDetails && parseInt(latest.loanDetails.term)) ||
          latest.termMonths ||
          latest.term ||
          latest.offer?.termMonths ||
          null
        ),
        monthlyPayment: latest.monthlyPayment ?? latest.offer?.monthlyPayment ?? null,
        apr: latest.apr ?? latest.offer?.apr ?? null,
        totalInterest: latest.totalInterest ?? latest.offer?.totalInterest ?? null,
        maxAmount: latest.maxLoanAmount ?? latest.offer?.maxAmount ?? null,
        pricingModel: latest.pricingModel,
        availableTerms: latest.availableTerms || latest.offer?.availableTerms,
        expirationDate: latest.expirationDate
      } : null;

      setUserCreditData({
        userId,
        ...responseData,
        currentScore: responseData.currentScore,
        lendingDecision: normalizedDecision,
        engine: responseData.engine || 'default',
        engineVersion: responseData.scoreResult?.version || responseData.engineVersion,
        dti: computeNormalizedDti()
      });
      if (normalizedOffer) setLoanOffer(normalizedOffer);
    } catch (err) {
      const errorMessage = err.response?.data?.error || err.message || 'Failed to load credit data';
      setCreditDataError(errorMessage);
      toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
    } finally {
      setLoadingCreditData(false);
    }
  }, [api, toast]);

  // Handle user selection
  const handleUserSelect = useCallback(async (user) => {
    setUserCreditData(null);
    setCreditDataError(null);
    setLoanOffer(null);
    setSelectedUser(user);

    try {
      await fetchUserCreditDataInline(user._id);
    } catch (err) {
      toast({
        title: 'Error',
        description: err.response?.data?.error || err.message || 'Failed to fetch data',
        variant: 'destructive',
      });
    }

    setActiveTab('borrower');
  }, [toast, fetchUserCreditDataInline]);

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

  const [activeTab, setActiveTab] = useState('overview');

  // Fetch dashboard metrics
  const fetchDashboardMetricsCallback = useCallback(async () => {
    try {
      await fetchDashboardMetrics(setDashboardMetrics, toast);
    } catch (error) {
      setDashboardMetrics({
        approvedLoans: 0,
        pendingLoans: 0,
        rejectedLoans: 0,
        avgDecisionTime: '0m',
        riskBreakdown: { low: 0, medium: 0, high: 0 }
      });
      toast({
        title: 'Error',
        description: 'Failed to fetch dashboard metrics',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Fetch recent decisions
  const fetchRecentDecisionsCallback = useCallback(async () => {
    try {
      const decisions = await fetchRecentDecisions();
      setRecentDecisions(decisions);
      return decisions;
    } catch (error) {
      setRecentDecisions([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch recent decisions',
        variant: 'destructive'
      });
      return [];
    }
  }, [toast]);

  // Fetch alerts
  const fetchAlertsCallback = useCallback(async (recentDecisions) => {
    try {
      await fetchAlerts(recentDecisions, setAlerts);
    } catch (error) {
      setAlerts([]);
      toast({
        title: 'Error',
        description: 'Failed to fetch alerts',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Manual refresh function
  const manualRefreshCallback = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDashboardMetricsCallback();
      const recentDecisions = await fetchRecentDecisionsCallback();
      await fetchAlertsCallback(recentDecisions);
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
  }, [fetchDashboardMetricsCallback, fetchRecentDecisionsCallback, fetchAlertsCallback, toast]);

  // Polling logic
  const poll = useCallback(async () => {
    if (document.visibilityState !== 'visible') return;
    
    try {
      await fetchDashboardMetricsCallback();
      const recentDecisions = await fetchRecentDecisionsCallback();
      await fetchAlertsCallback(recentDecisions);
          setPollingState(prev => ({
            ...prev,
            consecutiveErrors: 0,
            currentInterval: prev.baseInterval,
            lastError: null
          }));
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
  }, [fetchDashboardMetricsCallback, fetchRecentDecisionsCallback, fetchAlertsCallback]);

  const startPolling = useCallback(() => {
    setPollingState(prev => ({ 
      ...prev, 
      isActive: true, 
      consecutiveErrors: 0, 
      lastError: null, 
      currentInterval: prev.baseInterval 
    }));
  }, []);

  // Handle visibility change
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !pollingState.isActive) {
          startPolling();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [pollingState.isActive, startPolling]);

  // Polling interval management
  useEffect(() => {
    if (!pollingState.isActive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    poll();
    intervalRef.current = setInterval(() => poll(), pollingState.currentInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [pollingState.isActive, pollingState.currentInterval, poll]);

  // Start polling on mount
  useEffect(() => {
    startPolling();
    return () => {
      setPollingState(prev => ({ ...prev, isActive: false }));
    };
  }, [startPolling]);

  // Save manual decision
  const saveManualDecision = useCallback(async () => {
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
        loanType: manualDecision.loanType,
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
          loanType: manualDecision.loanType,
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
      await fetchRecentDecisionsCallback();
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Failed to save decision',
        variant: 'destructive',
      });
    }
  }, [manualDecision, userCreditData, toast, fetchRecentDecisionsCallback]);

  // Start editing decision
  const startEditingDecision = useCallback(() => {
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
      loanType: userCreditData?.lendingDecision?.loanType || ''
    });
    setIsEditingDecision(true);
  }, [userCreditData]);

  // Submit new income
  const submitNewIncome = useCallback(async () => {
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
  }, [selectedUser, newIncome, toast]);

  // Recalculate with collateral
  const recalculateWithCollateral = useCallback(async () => {
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
  }, [selectedUser, hasCollateral, collateralValue, toast]);

  // Send offer
  const sendOffer = useCallback(async () => {
    if (!selectedUser || !loanOffer) return;
    setSendingOffer(true);
    try {
      await api.post(`/lenders/save-decision/${selectedUser._id}`, {
        decision: 'Approve',
        notes: 'Offer sent to borrower',
        loanDetails: {
          amount: loanOffer.amount,
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
  }, [selectedUser, loanOffer, toast]);

  // Decline offer
  const declineOffer = useCallback(async () => {
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
  }, [selectedUser, loanOffer, toast]);

  // Handle decision actions
  const handleDecisionAction = useCallback(async (action) => {
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
          setIsEditingDecision(true);
          toast({ 
            title: 'Edit Mode', 
            description: 'You can now edit the loan offer terms.' 
          });
          break;

        case 'download':
          toast({ 
            title: 'Download Started', 
            description: 'PDF summary is being generated...' 
          });
          // Implement PDF generation here
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
  }, [selectedUser, sendOffer, declineOffer, toast]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Fetch initial data (once)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await fetchDashboardMetricsCallback();
      const decisions = await fetchRecentDecisionsCallback();
      if (!cancelled) {
        await fetchAlertsCallback(decisions);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle manual decision change
  const handleManualDecision = useCallback((field, value) => {
    setManualDecision(prev => ({ ...prev, [field]: value }));
  }, []);

  const startEditingIncome = useCallback(() => setEditingIncome(true), []);

  const handleBatchUploadOpen = useCallback(() => {
    setShowBatchUpload(true);
  }, []);

  const handleBatchUploadClose = useCallback(() => setShowBatchUpload(false), []);

  const handleBatchUploadComplete = useCallback(async (results) => {
    setShowBatchUpload(false);
    setBatchResults(results);
    if (selectedUser) {
      try {
        await api.post(`/users/${selectedUser._id}/refresh-credit-score`);
        await fetchUserCreditDataInline(selectedUser._id);
      } catch (err) {
        console.warn('Credit score refresh failed:', err);
      }
    }
  }, [selectedUser, api, fetchUserCreditDataInline]);

  // Derived values for metrics
  const totalLoans = dashboardMetrics.approvedLoans + dashboardMetrics.pendingLoans + dashboardMetrics.rejectedLoans;
  const approvalRate = totalLoans > 0 ? ((dashboardMetrics.approvedLoans / totalLoans) * 100).toFixed(1) : 0;

  // Enhanced Metrics Cards
  const renderEnhancedMetrics = () => {
    const metricsData = [
      { 
        title: 'Approved Loans', 
        value: dashboardMetrics.approvedLoans, 
        icon: CheckCircle2, 
        color: 'emerald',
        gradient: 'bg-gradient-to-r from-emerald-500 to-emerald-700',
        trend: '+12%',
        trendUp: true,
        description: 'Successfully funded'
      },
      { 
        title: 'Pending Review', 
        value: dashboardMetrics.pendingLoans, 
        icon: Clock, 
        color: 'amber',
        gradient: 'bg-gradient-to-r from-amber-500 to-amber-700',
        trend: '-5%',
        trendUp: false,
        description: 'Awaiting decision'
      },
      { 
        title: 'Rejected Applications', 
        value: dashboardMetrics.rejectedLoans, 
        icon: XCircle, 
        color: 'red',
        gradient: 'bg-gradient-to-r from-red-500 to-red-700',
        trend: '-8%',
        trendUp: true,
        description: 'Did not meet criteria'
      },
      { 
        title: 'Avg. Decision Time', 
        value: dashboardMetrics.avgDecisionTime, 
        icon: Activity, 
        color: 'blue',
        gradient: 'bg-gradient-to-r from-blue-500 to-blue-700',
        trend: '-15%',
        trendUp: true,
        description: 'Processing efficiency'
      }
    ];

    return (
      <div className="space-y-8 animate-fade-in">
        {/* Hero Metrics Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 text-white shadow-lg">
          <div className="absolute inset-0 bg-black/20"></div>
          <div className="relative z-10">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold">Portfolio Overview</h2>
                <p className="text-white/80">Real-time lending metrics and performance</p>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-white/20 px-4 py-2 backdrop-blur-sm">
                <Sparkles className="h-4 w-4" />
                <span className="text-sm font-medium">Live</span>
              </div>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{totalLoans}</div>
                <div className="text-white/80 text-sm">Total Applications</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">{approvalRate}%</div>
                <div className="text-white/80 text-sm">Approval Rate</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">─</div>
                <div className="text-white/80 text-sm">Total Funded</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-1">─</div>
                <div className="text-white/80 text-sm">Avg Risk Score</div>
              </div>
            </div>
          </div>
        </div>

        {/* Individual Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsData.map((metric, index) => (
            <Card 
              key={index} 
              className="group relative overflow-hidden border-0 bg-card shadow-lg hover:shadow-xl transition-all duration-500 hover:scale-105"
            >
              <div className={`absolute inset-0 ${metric.gradient} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
              
              <CardContent className="relative p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className={`rounded-2xl p-3 ${metric.gradient} shadow-lg`}>
                    <metric.icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="text-right">
                    <div className={`flex items-center gap-1 text-xs font-semibold ${
                      metric.trendUp ? 'text-emerald-500' : 'text-red-500'
                    }`}>
                      {metric.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      {metric.trend}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-foreground">
                    {metric.value}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {metric.description}
                  </div>
                </div>

                {metric.title.includes('Loans') && totalLoans > 0 && (
                  <div className="mt-4">
                    <div className="mb-1 flex justify-between text-xs text-muted-foreground">
                      <span>Portfolio %</span>
                      <span>{((metric.value / totalLoans) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div 
                        className={`h-full transition-all duration-1000 ease-out ${metric.gradient}`}
                        style={{ 
                          width: `${((metric.value / totalLoans) * 100)}%`,
                          animationDelay: `${index * 100}ms`
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Risk Analysis Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="border-0 bg-gradient-to-r from-emerald-500 to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium opacity-90">Low Risk Portfolio</div>
                  <div className="text-3xl font-bold">{dashboardMetrics.riskBreakdown.low}%</div>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <Shield className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium opacity-90">Medium Risk Portfolio</div>
                  <div className="text-3xl font-bold">{dashboardMetrics.riskBreakdown.medium}%</div>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <Target className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium opacity-90">High Risk Portfolio</div>
                  <div className="text-3xl font-bold">{dashboardMetrics.riskBreakdown.high}%</div>
                </div>
                <div className="rounded-full bg-white/20 p-3">
                  <AlertOctagon className="h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background transition-colors duration-300">
        <div className="container mx-auto px-6 py-8">
            {/* Header */}
            <Header
              darkMode={darkMode}
              toggleDarkMode={toggleDarkMode}
              refreshing={refreshing}
              pollingState={pollingState}
              onRefresh={manualRefreshCallback}
              onOpenBatchUpload={handleBatchUploadOpen}
              onOpenRegister={() => setShowRegister(true)}
            />

            {/* Search Panel */}
            <SearchPanel
              searchQuery={searchQuery}
              onSearchChange={handleSearch}
              onSearch={handleSearchSubmit}
              users={users}
              loading={loading}
              onSelectUser={async (user) => {
                setSelectedUser(user);
                await loadUserCreditData(user);
                await loadRecentDecisions();
              }}
            />

          {/* Enhanced Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid grid-cols-5 h-14 rounded-2xl bg-muted/50 p-1 shadow-inner">
                <TabsTrigger value="overview" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <BarChart4 className="h-4 w-4 mr-2" />
                Overview
              </TabsTrigger>
                <TabsTrigger value="borrower" disabled={!selectedUser} className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <User className="h-4 w-4 mr-2" />
                Borrower
              </TabsTrigger>
                <TabsTrigger value="decision" disabled={!selectedUser} className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <FileText className="h-4 w-4 mr-2" />
                Decision
              </TabsTrigger>
                <TabsTrigger value="config" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <Settings className="h-4 w-4 mr-2" />
                Config
              </TabsTrigger>
                <TabsTrigger value="activity" className="rounded-xl data-[state=active]:bg-gradient-to-r data-[state=active]:from-indigo-500 data-[state=active]:to-purple-500 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-300">
                <TrendingUp className="h-4 w-4 mr-2" />
                Activity
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-8">
              {renderEnhancedMetrics()}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <AlertsPanel alerts={alerts} />
                <RecentDecisionsPanel recentDecisions={recentDecisions} />
              </div>
            </TabsContent>
            
            <TabsContent value="borrower" className="space-y-6">
              {selectedUser && (
                <div className="space-y-8">
                  <BorrowerSnapshot
                    userCreditData={userCreditData}
                    selectedUser={selectedUser}
                    closeBorrowerView={closeBorrowerView}
                    loadingCreditData={loadingCreditData}
                    startEditingIncome={startEditingIncome}
                    renderDecisionBadge={DecisionBadge}
                  />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <LoanDecisionStatus
                      decision={userCreditData?.lendingDecision}
                      loanOffer={userCreditData?.lendingDecision?.offer || loanOffer}
                      onDecisionAction={handleDecisionAction}
                      isLender={true}
                    />
                    {userCreditData && (
                        <Card className="border-0 bg-card shadow-lg">
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <CardTitle className="text-xl">Decision Controls</CardTitle>
                            {!isEditingDecision && (
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={startEditingDecision}
                                className="border-border hover:bg-muted"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Edit Decision
                              </Button>
                            )}
                          </div>
                        </CardHeader>
                        <CardContent>
                          {!isEditingDecision ? (
                            <div className="space-y-4">
                              <div className="flex items-center gap-3">
                                <span className="font-medium">Current Decision:</span>
                                <DecisionBadge decision={userCreditData?.lendingDecision?.decision || 'Review'} />
                              </div>
                              {userCreditData?.lendingDecision?.manualNotes && (
                                <div className="rounded-lg bg-muted/50 p-4">
                                  <span className="font-medium">Notes:</span>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {userCreditData.lendingDecision.manualNotes}
                                  </p>
                                </div>
                              )}
                              {userCreditData?.lendingDecision?.flagForReview && (
                                  <div className="flex items-center gap-2 text-amber-500 p-3 rounded-lg bg-amber-500/10">
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
                  </div>
                  {userCreditData?.lendingDecision && (
                    <LendingDecisionDetails lendingDecision={userCreditData.lendingDecision} />
                  )}
                  {userCreditData && (
                    <RiskTierOverridePanel
                      userCreditData={userCreditData}
                      isEditingDecision={isEditingDecision}
                      manualDecision={manualDecision}
                      handleManualDecision={handleManualDecision}
                      user={user}
                    />
                  )}
                </div>
              )}
            </TabsContent>

            <TabsContent value="decision" className="space-y-6">
              {selectedUser ? (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Decision Details</h3>
                  <p className="text-muted-foreground">Advanced decision analysis and tools</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <h3 className="text-xl font-semibold text-muted-foreground">No borrower selected</h3>
                  <p className="text-muted-foreground">Select a borrower to view decision details</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="config" className="space-y-6">
              <DecisionConfigPanel />
            </TabsContent>

            <TabsContent value="activity" className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <RecentDecisionsPanel recentDecisions={recentDecisions} />
                </div>
                <div>
                  <AlertsPanel alerts={alerts} />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Dialogs */}
          {showBatchUpload && (
            <BatchUploadDialog 
              showBatchUpload={showBatchUpload}
              handleBatchUploadClose={handleBatchUploadClose}
              handleBatchUploadComplete={handleBatchUploadComplete}
              toast={toast}
            />
          )}

          {showRegister && (
            <RegisterUserDialog 
              open={showRegister}
              onClose={() => setShowRegister(false)}
            />
          )}

          {batchResults && (
            <BatchUploadResults 
              results={batchResults}
              onClose={() => setBatchResults(null)}
            />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};

export default LenderDashboard;
// src/components/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef, Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Users, CreditCard, History, User, Settings, LogOut, Search, Bell, 
  UserPlus, Upload, MoreHorizontal, FileText, Download, AlertCircle, 
  CheckCircle2, XCircle, Clock, ChevronDown, ChevronUp, ChevronLeft, 
  ChevronRight, Loader2, RefreshCw, BarChart2, Plus, TrendingUp,
  Shield, Lock, Flag, BarChart, Database, Sliders, Code, ClipboardList,
  MessageSquare, Server, Eye, Edit, Trash2, Send, Key, Filter, List
} from 'lucide-react';

// UI Components
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { useToast } from '../hooks/use-toast';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "./ui/dropdown-menu";
import { TooltipProvider } from './ui/tooltip';

// Custom Components
import RegisterUser from './admin/RegisterUser';
import AdminBatchUpload from './AdminBatchUpload';
import UploadHistory from './admin/UploadHistory';
import AuditLogs from './admin/AuditLogs';
import RoleManagement from './admin/RoleManagement';
import NotificationCenter from './admin/NotificationCenter';
import FraudDetectionPanel from './admin/FraudDetectionPanel';
import CompliancePanel from './admin/CompliancePanel';
import ScoringEngineControl from './admin/ScoringEngineControl';
import AISettingsPanel from './admin/AISettingsPanel';
import SystemMonitor from './admin/SystemMonitor';
import UserApproval from './admin/UserApproval';
import SchemaMappingEngine from './admin/SchemaMappingEngine';
import { useAuth } from '../contexts/AuthContext';
import { api, fetchAdminStats } from '../lib/api';
import LenderAccessHistoryPanel from './LenderAccessHistoryPanel';

const UserManagementPanel = lazy(() => import('./admin/UserManagementPanel'));
const LendingDecisionsPanel = lazy(() => import('./admin/LendingDecisionsPanel'));
const CreditOversightPanel = lazy(() => import('./admin/CreditOversightPanel'));
const AnalyticsPanel = lazy(() => import('./admin/AnalyticsPanel'));
const SupportCenterPanel = lazy(() => import('./admin/SupportCenterPanel'));

// Primary color and complementary palette
const PRIMARY_COLOR = '#0d261c';
const PRIMARY_LIGHT = '#1a4a38';
const SECONDARY_COLOR = '#8bc34a';
const ACCENT_COLOR = '#ffd54f';
const LIGHT_BG = '#f0f7f4';
const DARK_BG = '#0a1d15';
const MATTE_BLACK = '#18191a';

const AdminDashboard = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [creditReports, setCreditReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showRegisterUser, setShowRegisterUser] = useState(false);
  const [showBatchUpload, setShowBatchUpload] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    newUsers: 0,
    avgScore: 0,
    approvalRate: 0,
    rejectionRate: 0
  });
  const [analyticsData, setAnalyticsData] = useState([]);
  const [scoreFilter, setScoreFilter] = useState('all');
  const intervalRef = useRef(null);
  const isMountedRef = useRef(true);
  const [lendingDecisions, setLendingDecisions] = useState([]);
  const [lendingLoading, setLendingLoading] = useState(false);
  const [adminList, setAdminList] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogsLoading, setAdminLogsLoading] = useState(false);

  // Group lending decisions by applicant (user)
  const [groupedLendingDecisions, setGroupedLendingDecisions] = useState([]);
  const [selectedUserDecisions, setSelectedUserDecisions] = useState(null);

  // Navigation structure
  const navSections = [
    { id: 'dashboard', title: 'Dashboard', icon: <BarChart className="h-5 w-5 mr-3" />, color: SECONDARY_COLOR },
    { id: 'user-management', title: 'User Management', icon: <Users className="h-5 w-5 mr-3" />, color: '#4caf50' },
    { id: 'user-approval', title: 'User Approval', icon: <Clock className="h-5 w-5 mr-3" />, color: '#ff9800' },
    { id: 'credit-oversight', title: 'Credit Oversight', icon: <CreditCard className="h-5 w-5 mr-3" />, color: '#2196f3' },
    { id: 'batch-uploads', title: 'Batch Uploads', icon: <Upload className="h-5 w-5 mr-3" />, color: '#ff9800' },
    { id: 'lending-decisions', title: 'Lending Decisions', icon: <ClipboardList className="h-5 w-5 mr-3" />, color: '#9c27b0' },
    { id: 'data-tools', title: 'Data Tools', icon: <Database className="h-5 w-5 mr-3" />, color: '#607d8b' },
    { id: 'schema-mapping', title: 'Schema Mapping', icon: <Code className="h-5 w-5 mr-3" />, color: '#8bc34a' },
    { id: 'analytics', title: 'Analytics', icon: <BarChart2 className="h-5 w-5 mr-3" />, color: '#e91e63' },
    { id: 'fraud', title: 'Fraud Detection', icon: <Shield className="h-5 w-5 mr-3" />, color: '#f44336' },
    { id: 'scoring-engine', title: 'Scoring Engine', icon: <Code className="h-5 w-5 mr-3" />, color: '#00bcd4' },
    { id: 'ai-settings', title: 'AI Settings', icon: <Sliders className="h-5 w-5 mr-3" />, color: '#673ab7' },
    { id: 'compliance', title: 'Compliance', icon: <Lock className="h-5 w-5 mr-3" />, color: '#3f51b5' },
    { id: 'access-control', title: 'Access Control', icon: <Key className="h-5 w-5 mr-3" />, color: '#ff5722' },
    { id: 'notifications', title: 'Notifications', icon: <Bell className="h-5 w-5 mr-3" />, color: '#ffc107' },
    { id: 'support', title: 'Support Center', icon: <MessageSquare className="h-5 w-5 mr-3" />, color: '#009688' },
    { id: 'system', title: 'System Monitor', icon: <Server className="h-5 w-5 mr-3" />, color: '#795548' },
    { id: 'lender-access-history', title: 'Lender Access History', icon: <Eye className="h-5 w-5 mr-3" />, color: '#607d8b' },
  ];

  // Fetch admin stats on mount
  useEffect(() => {
    fetchAdminStats()
      .then(data => setStats(data))
      .catch(error => {
        toast({
          title: 'Failed to load admin stats',
          description: error.message,
          variant: 'error'
        });
      });
  }, [toast]);

  // Fetch users
  const fetchUsers = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      const params = { page, limit: 10, search };
      const response = await api.get('/admin/users', { params });
      
      setUsers(response.data.data || response.data);
      
      if (response.data.pagination) {
        setPagination(prev => ({
          ...prev,
          current: response.data.pagination.current,
          pageSize: response.data.pagination.pageSize,
          total: response.data.pagination.total,
          totalPages: response.data.pagination.totalPages
        }));
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to fetch users');
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        toast({
          title: 'Session expired',
          description: 'Please log in again',
          variant: 'destructive',
        });
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, logout, toast]);

  // Fetch credit reports with filtering
  const fetchCreditReports = useCallback(async (page = 1, search = '', filter = scoreFilter) => {
    try {
      setLoading(true);
      const response = await api.get('/admin/credit-reports', {
        params: {
          page,
          limit: 10,
          search,
          filter
        }
      });
      setCreditReports(response.data.reports || []);
      setPagination(response.data.pagination || { current: 1, totalPages: 1 });
    } catch (error) {
      console.error('Error fetching credit reports:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch credit reports',
        variant: 'destructive',
        });
    } finally {
      setLoading(false);
    }
  }, [toast, scoreFilter]);

  // Fetch analytics data
  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/analytics');
      setAnalyticsData(response.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch analytics data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch lending decisions
  const fetchLendingDecisions = useCallback(async () => {
    try {
      setLendingLoading(true);
      const response = await api.get('/admin/lending-decisions');
      // Flatten lending decisions for table display
      const flatDecisions = (response.data.decisions || []).map(decision => ({
        id: decision.id || decision._id,
        applicant: decision.applicant?.name || decision.applicant?.email || decision.applicant || 'Unknown',
        decision: decision.decision,
        score: decision.score,
        reason: decision.reason,
        officer: decision.officer?.name || decision.officer?.email || decision.officer || 'N/A',
        bank: decision.bank || 'N/A',
        date: decision.date,
        raw: decision
      }));
      // Group decisions by applicant (using applicant as key)
      const grouped = {};
      flatDecisions.forEach(decision => {
        // Use applicant email or id if available for uniqueness
        const key = decision.applicant?.email || decision.applicant?.name || decision.applicant || 'Unknown';
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(decision);
      });
      // Convert to array for rendering
      const groupedArr = Object.entries(grouped).map(([user, decisions]) => ({
        user,
        latest: decisions[0], // or sort by date and pick latest
        all: decisions
      }));
      setGroupedLendingDecisions(groupedArr);
      setLendingDecisions(flatDecisions); // keep flat for details if needed
      console.log('LENDING DECISIONS (flatDecisions):', flatDecisions);
    } catch (error) {
      console.error('Error fetching lending decisions:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch lending decisions',
        variant: 'destructive',
      });
    } finally {
      setLendingLoading(false);
    }
  }, [toast]);

  // Fetch all admins
  const fetchAdminList = useCallback(async () => {
    try {
      const response = await api.get('/admin/admin-users');
      setAdminList(response.data.admins || []);
    } catch (error) {
      console.error('Error fetching admin list:', error);
    }
  }, []);

  // Fetch logs for selected admin
  const fetchAdminLogs = useCallback(async (adminId) => {
    try {
      setAdminLogsLoading(true);
      const response = await api.get(`/admin/audit-logs/${adminId}`);
      setAdminLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
    } finally {
      setAdminLogsLoading(false);
    }
  }, []);

  // Only poll for dashboard stats
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (activeTab === 'dashboard') {
      // Set up polling for dashboard stats
      const fetchDashboardStats = async () => {
        if (!isMountedRef.current) return;
        try {
          const data = await fetchAdminStats();
          setStats(data);
        } catch (error) {
          console.error('Error polling dashboard stats:', error);
        }
      };

      fetchDashboardStats();
      intervalRef.current = setInterval(fetchDashboardStats, 20000);
    } else if (activeTab === 'user-management') {
      fetchUsers();
    } else if (activeTab === 'credit-oversight') {
      fetchCreditReports();
    } else if (activeTab === 'analytics') {
      fetchAnalytics();
    } else if (activeTab === 'lending-decisions') {
      fetchLendingDecisions();
    } else if (activeTab === 'data-tools') {
      fetchAdminList();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeTab, fetchUsers, fetchCreditReports, fetchAnalytics, fetchLendingDecisions, fetchAdminList]);

  // Component unmount cleanup
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Fetch logs when selected admin changes
  useEffect(() => {
    if (selectedAdmin) {
      fetchAdminLogs(selectedAdmin._id);
    }
  }, [selectedAdmin, fetchAdminLogs]);

  // Handle batch upload completion
  const handleUploadComplete = useCallback((uploadData) => {
    if (activeTab === 'user-management') {
      fetchUsers();
    } else if (activeTab === 'credit-oversight') {
      fetchCreditReports();
    }
    
    toast({
      title: 'Upload Complete',
      description: `Successfully processed ${uploadData.successCount} records`,
    });
  }, [activeTab, fetchUsers, fetchCreditReports, toast]);

  // Handle user actions
  const handleUserAction = useCallback(async (userId, action) => {
    try {
      setLoading(true);
      
      let endpoint = '';
      let payload = {};
      
      switch(action) {
        case 'suspend':
          endpoint = `/admin/users/${userId}/status`;
          payload = { status: 'suspended', reason: 'Suspended by admin' };
          break;
        case 'activate':
          endpoint = `/admin/users/${userId}/status`;
          payload = { status: 'active', reason: 'Activated by admin' };
          break;
        case 'delete':
          endpoint = `/admin/users/${userId}`;
          break;
        case 'verify':
          endpoint = `/admin/users/${userId}/verify`;
          break;
        case 'reset-password':
          endpoint = `/admin/users/${userId}/reset-password`;
          break;
        case 'impersonate':
          // API to get impersonation token
          const response = await api.post(`/admin/users/${userId}/impersonate`);
          localStorage.setItem('impersonation_token', response.data.token);
          navigate('/dashboard');
          return;
        default:
          return;
      }
      
      if (action === 'delete') {
        await api.delete(endpoint);
      } else {
        await api.post(endpoint, payload);
      }
      
      if (action === 'verify') {
        toast({
          title: 'User account verified!',
          description: 'The user can now log in to the app.',
          variant: 'success',
        });
      } else {
        toast({
          title: 'Success',
          description: `User ${action.replace('-', ' ')} successful`,
        });
      }
      fetchUsers();
    } catch (err) {
      console.error(`Error performing ${action} on user:`, err);
      toast({
        title: 'Error',
        description: `Failed to ${action} user: ${err.message}`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [fetchUsers, navigate, toast]);

  // Apply filter
  const applyFilter = useCallback((filter) => {
    setScoreFilter(filter);
    fetchCreditReports(1, searchQuery, filter);
  }, [fetchCreditReports, searchQuery]);

  // Manual refresh handlers for each panel
  const handleUserManagementRefresh = useCallback(() => fetchUsers(), [fetchUsers]);
  const handleCreditOversightRefresh = useCallback(() => fetchCreditReports(), [fetchCreditReports]);
  const handleLendingDecisionsRefresh = useCallback(() => fetchLendingDecisions(), [fetchLendingDecisions]);
  const handleAnalyticsRefresh = useCallback(() => fetchAnalytics(), [fetchAnalytics]);

  // Loading state
  if (loading && activeTab === 'dashboard') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin h-16 w-16 border-t-4 border-b-4 border-[#8bc34a] rounded-full mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  // Error state
  if (error && activeTab === 'dashboard') {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg">
        <div className="flex items-center gap-4">
          <AlertCircle className="h-6 w-6 text-red-500" />
          <div>
            <h3 className="text-lg font-medium text-red-800 dark:text-red-200">Error</h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen w-full bg-gray-50 dark:bg-[#18191a] flex overflow-x-hidden" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
        {/* Navigation Sidebar */}
        <div 
          className="fixed left-0 top-0 h-full w-64 bg-[#0d261c] dark:bg-[#18191a] border-r border-[#1a4a38] z-10 overflow-y-auto"
          style={{ backgroundColor: PRIMARY_COLOR, ...(darkMode && { backgroundColor: MATTE_BLACK, borderRightColor: MATTE_BLACK }) }}
        >
          <div className="p-5 border-b border-[#1a4a38] sticky top-0 bg-[#0d261c] z-10" style={darkMode ? { backgroundColor: MATTE_BLACK } : { backgroundColor: PRIMARY_COLOR }}>
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-[#8bc34a] to-[#ffd54f] w-10 h-10 rounded-lg flex items-center justify-center">
                <CreditCard className="text-white" />
              </div>
              <div>
                <h1 className="font-bold text-xl bg-gradient-to-r from-[#8bc34a] to-[#ffd54f] bg-clip-text text-transparent">CreditAdmin</h1>
                <p className="text-xs text-[#a8d5ba]">Admin Dashboard</p>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <nav className="space-y-1">
              {navSections.map((section) => (
                <button 
                  key={section.id}
                  className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${
                    activeTab === section.id 
                      ? 'bg-[#1a4a38] text-white' 
                      : 'text-[#a8d5ba] hover:bg-[#1a4a38]'
                  }`}
                  onClick={() => setActiveTab(section.id)}
                  style={{ borderLeft: activeTab === section.id ? `4px solid ${section.color}` : 'none' }}
                >
                  {section.icon}
                  {section.title}
                </button>
              ))}
            </nav>
          </div>
          
          <div className="absolute bottom-0 left-0 w-full p-4 border-t border-[#1a4a38] bg-[#0d261c]" style={darkMode ? { backgroundColor: MATTE_BLACK, borderTopColor: MATTE_BLACK } : { backgroundColor: PRIMARY_COLOR }}>
            <button 
              onClick={logout}
              className="flex items-center w-full px-4 py-3 rounded-lg text-[#a8d5ba] hover:bg-[#1a4a38] transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Logout
            </button>
          </div>
        </div>
        
        {/* Main Content */}
        <div className="ml-64 flex-1 p-6 bg-white dark:bg-[#18191a] min-h-screen transition-colors duration-300" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
          {/* Top Navigation */}
          <div className="flex flex-col md:flex-row flex-wrap items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">
                {navSections.find(s => s.id === activeTab)?.title || 'Dashboard'}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                {activeTab === 'dashboard' && 'Overview of system metrics and performance'}
                {activeTab === 'user-management' && 'Manage system users and their permissions'}
                {activeTab === 'credit-oversight' && 'View and manage user credit reports'}
                {activeTab === 'batch-uploads' && 'Track batch upload history and status'}
                {activeTab === 'lending-decisions' && 'Review lending decision logs and overrides'}
                {activeTab === 'data-tools' && 'Manual data adjustments and overrides'}
                {activeTab === 'schema-mapping' && 'Map external data formats to internal schema'}
                {activeTab === 'analytics' && 'Analyze user credit data and trends'}
                {activeTab === 'fraud' && 'Detect and investigate suspicious patterns'}
                {activeTab === 'scoring-engine' && 'Manage scoring model versions'}
                {activeTab === 'ai-settings' && 'Configure AI scoring parameters'}
                {activeTab === 'compliance' && 'Manage consent and regulatory compliance'}
                {activeTab === 'access-control' && 'Configure roles and permissions'}
                {activeTab === 'notifications' && 'Manage system notifications'}
                {activeTab === 'support' && 'Internal communication and ticketing'}
                {activeTab === 'system' && 'Monitor system health and errors'}
                {activeTab === 'lender-access-history' && 'View historical access logs for lenders'}
              </p>
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
          
          {/* Dashboard Stats */}
          {activeTab === 'dashboard' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card className="bg-white dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 transition-colors duration-300" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                <CardContent className="p-6" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Total Users</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.totalUsers}</h3>
                    </div>
                    <div className="bg-green-400 text-white p-3 rounded-lg">
                      <Users className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-[#4caf50] mt-2">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>{stats.newUsers} new this month</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 transition-colors duration-300" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                <CardContent className="p-6" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Avg. Credit Score</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.avgScore}</h3>
                    </div>
                    <div className="bg-[#8bc34a] text-white p-3 rounded-lg">
                      <BarChart2 className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-[#4caf50] mt-2">
                    <TrendingUp className="h-4 w-4 mr-1" />
                    <span>15 points increase</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 transition-colors duration-300" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                <CardContent className="p-6" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Approval Rate</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.approvalRate}%</h3>
                    </div>
                    <div className="bg-[#8bc34a] text-white p-3 rounded-lg">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-[#f44336] mt-2">
                    <span>Rejection Rate: {stats.rejectionRate}%</span>
                  </div>
                </CardContent>
              </Card>
              
              {/* Additional stats cards */}
              <Card className="bg-white dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 transition-colors duration-300" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                <CardContent className="p-6" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Active Users</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{stats.activeUsers}</h3>
                    </div>
                    <div className="bg-[#2196f3] text-white p-3 rounded-lg">
                      <User className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-[#4caf50] mt-2">
                    <span>{Math.round((stats.activeUsers / stats.totalUsers) * 100)}% active</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 transition-colors duration-300" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                <CardContent className="p-6" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">Flagged Users</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">42</h3>
                    </div>
                    <div className="bg-[#f44336] text-white p-3 rounded-lg">
                      <Flag className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-[#f44336] mt-2">
                    <span>12 new this week</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white dark:bg-[#18191a] border border-gray-200 dark:border-gray-700 transition-colors duration-300" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                <CardContent className="p-6" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">System Health</p>
                      <h3 className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">Operational</h3>
                    </div>
                    <div className="bg-[#4caf50] text-white p-3 rounded-lg">
                      <Server className="h-6 w-6" />
                    </div>
                  </div>
                  <div className="flex items-center text-sm text-[#4caf50] mt-2">
                    <span>All systems normal</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* Content Sections */}
          <div className="space-y-6" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
            {/* User Management */}
            {activeTab === 'user-management' && (
              <Suspense fallback={<div className="p-8 text-center">Loading user management...</div>}>
                <UserManagementPanel
                  users={users}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchTimeout={searchTimeout}
                  setSearchTimeout={setSearchTimeout}
                  fetchUsers={fetchUsers}
                  navigate={navigate}
                  setShowRegisterUser={setShowRegisterUser}
                  setShowBatchUpload={setShowBatchUpload}
                  setActiveTab={setActiveTab}
                  handleUserAction={handleUserAction}
                  loading={loading}
                  error={error}
                  onRefresh={handleUserManagementRefresh}
                />
              </Suspense>
            )}

            {/* User Approval */}
            {activeTab === 'user-approval' && (
              <UserApproval />
            )}

            {/* Credit Oversight */}
            {activeTab === 'credit-oversight' && (
              <Suspense fallback={<div className="p-8 text-center">Loading credit oversight...</div>}>
                <CreditOversightPanel
                  loading={loading}
                  error={error}
                  scoreFilter={scoreFilter}
                  setScoreFilter={setScoreFilter}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  searchTimeout={searchTimeout}
                  setSearchTimeout={setSearchTimeout}
                  fetchCreditReports={fetchCreditReports}
                  applyFilter={applyFilter}
                  creditReports={creditReports}
                  toast={toast}
                  api={api}
                  onRefresh={handleCreditOversightRefresh}
                />
              </Suspense>
            )}

            {/* Batch Uploads */}
            {activeTab === 'batch-uploads' && (
              <div className="space-y-6">
                <Card className="border border-[#1a4a38]" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-gray-900 dark:text-white">Batch Uploads</CardTitle>
                        <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                          Upload and manage credit data batches
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button 
                          onClick={() => setShowBatchUpload(true)}
                          className="bg-[#ff9800] hover:bg-[#e68a00] text-white"
                        >
                          <Upload className="mr-2 h-4 w-4" />
                          New Upload
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <AdminBatchUpload onUploadComplete={handleUploadComplete} />
                  </CardContent>
                </Card>
                
                <Card className="border border-[#1a4a38]" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Upload History</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      View past uploads and their status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <UploadHistory />
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Lending Decisions */}
            {activeTab === 'lending-decisions' && (
              <Suspense fallback={<div className="p-8 text-center">Loading lending decisions...</div>}>
                <LendingDecisionsPanel
                  lendingLoading={lendingLoading}
                  groupedLendingDecisions={groupedLendingDecisions}
                  error={error}
                  onRefresh={handleLendingDecisionsRefresh}
                  onUserSelect={setSelectedUserDecisions}
                  selectedUserDecisions={selectedUserDecisions}
                />
              </Suspense>
            )}

            {/* Data Tools */}
            {activeTab === 'data-tools' && (
              <div className="space-y-6">
                <Card className="border border-[#1a4a38]" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Data Overrides</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      Manually update credit factors and override decisions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="border border-[#1a4a38] rounded-lg p-4">
                        <h3 className="font-semibold mb-4">Update Credit Factors</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Select User</label>
                            <Input placeholder="Search user..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Factor to Update</label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  Select factor
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem>Payment History</DropdownMenuItem>
                                <DropdownMenuItem>Credit Utilization</DropdownMenuItem>
                                <DropdownMenuItem>Credit History Length</DropdownMenuItem>
                                <DropdownMenuItem>Recent Inquiries</DropdownMenuItem>
                                <DropdownMenuItem>Account Diversity</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">New Value</label>
                            <Input placeholder="Enter new value..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Reason for Change</label>
                            <Input placeholder="Explain the reason..." />
                          </div>
                          <Button className="w-full bg-[#607d8b] hover:bg-[#546e7a] text-white">
                            Update Factor
                          </Button>
                        </div>
                      </div>
                      
                      <div className="border border-[#1a4a38] rounded-lg p-4">
                        <h3 className="font-semibold mb-4">Decision Overrides</h3>
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">Select Application</label>
                            <Input placeholder="Search application..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">New Decision</label>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="w-full justify-between">
                                  Select decision
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent className="w-full">
                                <DropdownMenuItem>Approve</DropdownMenuItem>
                                <DropdownMenuItem>Reject</DropdownMenuItem>
                                <DropdownMenuItem>Request More Info</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Override Reason</label>
                            <Input placeholder="Explain the override reason..." />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Additional Notes</label>
                            <Input placeholder="Any additional information..." />
                          </div>
                          <Button className="w-full bg-[#607d8b] hover:bg-[#546e7a] text-white">
                            Override Decision
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="border border-[#1a4a38]" style={darkMode ? { backgroundColor: MATTE_BLACK } : {}}>
                  <CardHeader>
                    <CardTitle className="text-gray-900 dark:text-white">Audit Trail</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      Track all changes made in the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-6">
                      {/* Admin List */}
                      <div className="md:w-1/4 border-r border-[#1a4a38] pr-4">
                        <h4 className="font-semibold mb-2">Admins</h4>
                        <div className="space-y-2 max-h-72 overflow-y-auto">
                          {adminList.map((admin) => (
                            <button
                              key={admin._id}
                              className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedAdmin?._id === admin._id ? 'bg-[#e0efe9] dark:bg-[#1a4a38] font-bold' : 'hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]'}`}
                              onClick={() => setSelectedAdmin(admin)}
                            >
                              {admin.firstName || admin.name || ''} {admin.lastName || ''}
                              <div className="text-xs text-gray-500">{admin.email}</div>
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Admin Logs */}
                      <div className="flex-1">
                        <h4 className="font-semibold mb-2">{selectedAdmin ? `Actions by ${selectedAdmin.firstName || selectedAdmin.name}` : 'Select an admin to view their actions'}</h4>
                        {adminLogsLoading ? (
                          <div className="text-center py-8">
                            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-[#2196f3]" />
                            Loading logs...
                          </div>
                        ) : adminLogs.length === 0 ? (
                          <div className="text-center text-gray-500 py-8">
                            {selectedAdmin ? 'No actions found for this admin.' : 'Select an admin to view their audit trail.'}
                          </div>
                        ) : (
                          <div className="space-y-3 max-h-96 overflow-y-auto">
                            {adminLogs.map((log, idx) => (
                              <div key={log._id || idx} className="p-3 bg-[#f0f7f4] dark:bg-[#1a4a38] rounded-lg">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">
                                  {log.action}
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                  {log.createdAt ? format(new Date(log.createdAt), 'MMM d, yyyy h:mm a') : ''}
                                </div>
                                {log.details && (
                                  <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                    {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                                  </div>
                                )}
                                {log.description && (
                                  <div className="text-xs text-gray-700 dark:text-gray-300 mt-1">
                                    {log.description}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Schema Mapping */}
            {activeTab === 'schema-mapping' && (
              <SchemaMappingEngine />
            )}

            {/* Analytics */}
            {activeTab === 'analytics' && (
              <Suspense fallback={<div className="p-8 text-center">Loading analytics...</div>}>
                <AnalyticsPanel analyticsData={analyticsData} loading={loading} error={error} onRefresh={handleAnalyticsRefresh} />
              </Suspense>
            )}

            {/* Lender Access History */}
            {activeTab === 'lender-access-history' && (
              <LenderAccessHistoryPanel />
            )}

            {/* Other panels... (omitted for brevity) */}
          </div>
          
          {/* Modals */}
          <RegisterUser 
            open={showRegisterUser}
            onClose={() => setShowRegisterUser(false)}
            onSuccess={() => {
              setShowRegisterUser(false);
              fetchUsers();
              toast({
                title: 'Success',
                description: 'User registered successfully',
                variant: 'default',
              });
            }}
          />

          <AdminBatchUpload 
            open={showBatchUpload}
            onOpenChange={setShowBatchUpload}
            onUploadComplete={handleUploadComplete}
          />
        </div>
      </div>
    </TooltipProvider>
  );
};

export default AdminDashboard;
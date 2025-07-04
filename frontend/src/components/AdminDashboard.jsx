// src/components/AdminDashboard.jsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { useToast } from '../hooks/use-toast';
import { Skeleton } from './ui/skeleton';
import { Input } from './ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "./ui/dropdown-menu";

// Custom Components
import RegisterUser from './admin/RegisterUser';
import AdminBatchUpload from './AdminBatchUpload';
import UploadHistory from './admin/UploadHistory';
import UserDataViewer from './admin/UserDataViewer';
import AuditLogs from './admin/AuditLogs';
import RoleManagement from './admin/RoleManagement';
import NotificationCenter from './admin/NotificationCenter';
import FraudDetectionPanel from './admin/FraudDetectionPanel';
import CompliancePanel from './admin/CompliancePanel';
import ScoringEngineControl from './admin/ScoringEngineControl';
import AISettingsPanel from './admin/AISettingsPanel';
import SystemMonitor from './admin/SystemMonitor';
import UserApproval from './admin/UserApproval';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

// Primary color and complementary palette
const PRIMARY_COLOR = '#0d261c';
const PRIMARY_LIGHT = '#1a4a38';
const SECONDARY_COLOR = '#8bc34a';
const ACCENT_COLOR = '#ffd54f';
const LIGHT_BG = '#f0f7f4';
const DARK_BG = '#0a1d15';

const AdminDashboard = ({ darkMode, toggleDarkMode }) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  
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
  // Lending Decisions state
  const [lendingDecisions, setLendingDecisions] = useState([]);
  const [lendingLoading, setLendingLoading] = useState(false);
  // Admin Audit Trail state
  const [adminList, setAdminList] = useState([]);
  const [selectedAdmin, setSelectedAdmin] = useState(null);
  const [adminLogs, setAdminLogs] = useState([]);
  const [adminLogsLoading, setAdminLogsLoading] = useState(false);

  // Navigation structure
  const navSections = [
    {
      id: 'dashboard',
      title: 'Dashboard',
      icon: <BarChart className="h-5 w-5 mr-3" />,
      color: SECONDARY_COLOR
    },
    {
      id: 'user-management',
      title: 'User Management',
      icon: <Users className="h-5 w-5 mr-3" />,
      color: '#4caf50'
    },
    {
      id: 'user-approval',
      title: 'User Approval',
      icon: <Clock className="h-5 w-5 mr-3" />,
      color: '#ff9800'
    },
    {
      id: 'credit-oversight',
      title: 'Credit Oversight',
      icon: <CreditCard className="h-5 w-5 mr-3" />,
      color: '#2196f3'
    },
    {
      id: 'batch-uploads',
      title: 'Batch Uploads',
      icon: <Upload className="h-5 w-5 mr-3" />,
      color: '#ff9800'
    },
    {
      id: 'lending-decisions',
      title: 'Lending Decisions',
      icon: <ClipboardList className="h-5 w-5 mr-3" />,
      color: '#9c27b0'
    },
    {
      id: 'data-tools',
      title: 'Data Tools',
      icon: <Database className="h-5 w-5 mr-3" />,
      color: '#607d8b'
    },
    {
      id: 'analytics',
      title: 'Analytics',
      icon: <BarChart2 className="h-5 w-5 mr-3" />,
      color: '#e91e63'
    },
    {
      id: 'fraud',
      title: 'Fraud Detection',
      icon: <Shield className="h-5 w-5 mr-3" />,
      color: '#f44336'
    },
    {
      id: 'scoring-engine',
      title: 'Scoring Engine',
      icon: <Code className="h-5 w-5 mr-3" />,
      color: '#00bcd4'
    },
    {
      id: 'ai-settings',
      title: 'AI Settings',
      icon: <Sliders className="h-5 w-5 mr-3" />,
      color: '#673ab7'
    },
    {
      id: 'compliance',
      title: 'Compliance',
      icon: <Lock className="h-5 w-5 mr-3" />,
      color: '#3f51b5'
    },
    {
      id: 'access-control',
      title: 'Access Control',
      icon: <Key className="h-5 w-5 mr-3" />,
      color: '#ff5722'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      icon: <Bell className="h-5 w-5 mr-3" />,
      color: '#ffc107'
    },
    {
      id: 'support',
      title: 'Support Center',
      icon: <MessageSquare className="h-5 w-5 mr-3" />,
      color: '#009688'
    },
    {
      id: 'system',
      title: 'System Monitor',
      icon: <Server className="h-5 w-5 mr-3" />,
      color: '#795548'
    }
  ];

  // Fetch dashboard stats
  const fetchDashboardStats = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/stats');
      setStats(response.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  }, []);

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
      setLendingDecisions(response.data.decisions || []);
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

  // Initial data fetch
  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardStats();
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        fetchDashboardStats();
      }, 20000);
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
  }, [activeTab, fetchDashboardStats, fetchUsers, fetchCreditReports, fetchAnalytics, fetchLendingDecisions, fetchAdminList]);

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
  const applyFilter = (filter) => {
    setScoreFilter(filter);
    fetchCreditReports(1, searchQuery, filter);
  };

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
            <Button 
              variant="outline" 
              className="mt-2"
              onClick={fetchDashboardStats}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a1d15] flex">
      {/* Navigation Sidebar */}
      <div 
        className="fixed left-0 top-0 h-full w-64 bg-[#0d261c] dark:bg-[#0d261c] border-r border-[#1a4a38] z-10 overflow-y-auto"
        style={{ backgroundColor: PRIMARY_COLOR }}
      >
        <div className="p-5 border-b border-[#1a4a38] sticky top-0 bg-[#0d261c] z-10">
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
        
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-[#1a4a38] bg-[#0d261c]">
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
      <div className="ml-64 flex-1 p-6 bg-white dark:bg-gray-900 min-h-screen transition-colors duration-300">
        {/* Top Navigation */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
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
              {activeTab === 'analytics' && 'Analyze user credit data and trends'}
              {activeTab === 'fraud' && 'Detect and investigate suspicious patterns'}
              {activeTab === 'scoring-engine' && 'Manage scoring model versions'}
              {activeTab === 'ai-settings' && 'Configure AI scoring parameters'}
              {activeTab === 'compliance' && 'Manage consent and regulatory compliance'}
              {activeTab === 'access-control' && 'Configure roles and permissions'}
              {activeTab === 'notifications' && 'Manage system notifications'}
              {activeTab === 'support' && 'Internal communication and ticketing'}
              {activeTab === 'system' && 'Monitor system health and errors'}
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
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <CardContent className="p-6">
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
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <CardContent className="p-6">
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
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <CardContent className="p-6">
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
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <CardContent className="p-6">
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
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <CardContent className="p-6">
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
            
            <Card className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors duration-300">
              <CardContent className="p-6">
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
        <div className="space-y-6">
          {/* User Management */}
          {activeTab === 'user-management' && (
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">User Management</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      Manage system users and their permissions
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      onClick={() => setShowRegisterUser(true)}
                      className="bg-[#8bc34a] hover:bg-[#7cb342] text-white"
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Add User
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setShowBatchUpload(true)}
                      className="border-[#8bc34a] text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Batch Upload
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('user-approval')}
                      className="border-orange-500 text-orange-500 hover:bg-orange-50"
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Pending Approvals
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-[#8bc34a] text-[#8bc34a]">
                          <Filter className="mr-2 h-4 w-4" />
                          Filter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Active Users</DropdownMenuItem>
                        <DropdownMenuItem>Suspended Users</DropdownMenuItem>
                        <DropdownMenuItem>Unverified Users</DropdownMenuItem>
                        <DropdownMenuItem>Admins Only</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <div className="relative w-full sm:max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search by name, email, or role..."
                      className="pl-10 w-full"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        clearTimeout(searchTimeout);
                        setSearchTimeout(setTimeout(() => {
                          fetchUsers(1, e.target.value);
                        }, 500));
                      }}
                    />
                  </div>
                </div>
                
                <Table>
                  <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
                    <TableRow>
                      <TableHead className="font-semibold">User</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Credit Score</TableHead>
                      <TableHead className="font-semibold">Registration Date</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id} className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                        <TableCell className="font-medium">
                          <div className="flex items-center">
                            <div className="bg-[#8bc34a] text-white h-8 w-8 rounded-full flex items-center justify-center mr-3">
                              <User className="h-4 w-4" />
                            </div>
                            <div>
                              <div>{user.name}</div>
                              <div className="text-sm text-gray-600 dark:text-[#a8d5ba]">{user.email}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            className={`${
                              user.role === 'admin' 
                                ? 'bg-[#0d261c] text-white' 
                                : user.role === 'lender'
                                ? 'bg-[#ffd54f] text-[#0d261c]'
                                : 'bg-[#e0efe9] text-[#0d261c]'
                            }`}
                          >
                            {user.role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {user.emailVerified ? (
                            <Badge className="bg-blue-500 text-white">Verified</Badge>
                          ) : user.active ? (
                            <Badge className="bg-[#4caf50] text-white">Active</Badge>
                          ) : (
                            <Badge className="bg-gray-200 text-gray-700">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.creditScore ? (
                            <div className="flex items-center">
                              <span className="font-semibold mr-2">{user.creditScore.score}</span>
                              <Badge 
                                className={
                                  user.creditScore.score >= 800 
                                    ? 'bg-[#4caf50] text-white' 
                                    : user.creditScore.score >= 700 
                                    ? 'bg-[#8bc34a] text-white'
                                    : user.creditScore.score >= 600
                                    ? 'bg-[#ffd54f] text-[#0d261c]'
                                    : 'bg-[#f44336] text-white'
                                }
                              >
                                {user.creditScore.score >= 800 
                                  ? 'Excellent' 
                                  : user.creditScore.score >= 700 
                                  ? 'Good'
                                  : user.creditScore.score >= 600
                                  ? 'Fair'
                                  : 'Poor'}
                              </Badge>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">No score</span>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-[#a8d5ba]">
                          {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className="min-w-[180px] rounded-xl shadow-xl p-1 animate-fade-in bg-white dark:bg-[#1a4a38] border border-gray-200 dark:border-[#2e4d3d]">
                              <DropdownMenuItem className="px-4 py-3 text-base hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] flex items-center gap-2" onClick={() => navigate(`/admin/users/${user._id}`)}>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem className="px-4 py-3 text-base hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] flex items-center gap-2" onClick={() => navigate(`/admin/users/${user._id}/edit`)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem className="px-4 py-3 text-base hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'impersonate')}>
                                <User className="mr-2 h-4 w-4" />
                                Impersonate
                              </DropdownMenuItem>
                              <DropdownMenuItem className="px-4 py-3 text-base hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'reset-password')}>
                                <Key className="mr-2 h-4 w-4" />
                                Reset Password
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-[#2e4d3d]" />
                              {user.active ? (
                                <DropdownMenuItem className="px-4 py-3 text-base hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'suspend')}>
                                  <XCircle className="mr-2 h-4 w-4 text-yellow-600" />
                                  Suspend
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem className="px-4 py-3 text-base hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'activate')}>
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-green-600" />
                                  Activate
                                </DropdownMenuItem>
                              )}
                              {!user.emailVerified && (
                                <DropdownMenuItem className="px-4 py-3 text-base hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'verify')}>
                                  <CheckCircle2 className="mr-2 h-4 w-4 text-blue-600" />
                                  Verify
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-[#2e4d3d]" />
                              <DropdownMenuItem 
                                className="px-4 py-3 text-base text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2 font-semibold"
                                onClick={() => handleUserAction(user._id, 'delete')}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {pagination.total > 0 && (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-[#1a4a38]">
                    <div className="text-sm text-gray-600 dark:text-[#a8d5ba]">
                      Showing <span className="font-medium">{(pagination.current - 1) * pagination.pageSize + 1}</span> to{' '}
                      <span className="font-medium">
                        {Math.min(pagination.current * pagination.pageSize, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium">{pagination.total}</span> users
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers(pagination.current - 1, searchQuery)}
                        disabled={pagination.current === 1 || loading}
                        className="border-[#8bc34a] text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchUsers(pagination.current + 1, searchQuery)}
                        disabled={pagination.current >= pagination.totalPages || loading}
                        className="border-[#8bc34a] text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                      >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* User Approval */}
          {activeTab === 'user-approval' && (
            <UserApproval />
          )}

          {/* Credit Oversight */}
          {activeTab === 'credit-oversight' && (
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Credit Score Oversight</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      View and manage credit reports with full breakdowns
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      className="bg-[#2196f3] hover:bg-[#0b7dda] text-white"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          // Recalculate all scores
                          const response = await api.post('/admin/credit-reports/recalculate-all');
                          toast({
                            title: 'Success',
                            description: 'Credit scores are being recalculated',
                            variant: 'default',
                          });
                          fetchCreditReports(1, searchQuery);
                        } catch (error) {
                          console.error('Error recalculating scores:', error);
                          toast({
                            title: 'Error',
                            description: 'Failed to recalculate scores',
                            variant: 'destructive',
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                      Recalculate Scores
                    </Button>
                    <Button 
                      variant="outline" 
                      className="border-[#2196f3] text-[#2196f3] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                      onClick={async () => {
                        try {
                          setLoading(true);
                          // Flag suspicious scores
                          const response = await api.post('/admin/credit-reports/flag-suspicious');
                          toast({
                            title: 'Success',
                            description: 'Suspicious scores have been flagged',
                            variant: 'default',
                          });
                          fetchCreditReports(1, searchQuery);
                        } catch (error) {
                          console.error('Error flagging suspicious scores:', error);
                          toast({
                            title: 'Error',
                            description: 'Failed to flag suspicious scores',
                            variant: 'destructive',
                          });
                        } finally {
                          setLoading(false);
                        }
                      }}
                      disabled={loading}
                    >
                      <Flag className="mr-2 h-4 w-4" />
                      Flag Suspicious
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  {scoreFilter !== 'all' && (
                    <div className="mb-3">
                      <Badge className="bg-[#2196f3] text-white">
                        <Filter className="h-3 w-3 mr-1" />
                        Filtered: {scoreFilter === 'excellent' ? 'Excellent (800+)' :
                                  scoreFilter === 'good' ? 'Good (700-799)' :
                                  scoreFilter === 'fair' ? 'Fair (600-699)' :
                                  scoreFilter === 'poor' ? 'Poor (Below 600)' :
                                  scoreFilter === 'flagged' ? 'Flagged Scores' : scoreFilter}
                      </Badge>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div className="relative w-full sm:max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="text"
                        placeholder="Search by name or email..."
                        className="pl-10 w-full"
                        value={searchQuery}
                        onChange={(e) => {
                          setSearchQuery(e.target.value);
                          clearTimeout(searchTimeout);
                          setSearchTimeout(setTimeout(() => {
                            fetchCreditReports(1, e.target.value);
                          }, 500));
                        }}
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => fetchCreditReports(1, searchQuery)}
                        disabled={loading}
                        className="border-[#2196f3] text-[#2196f3] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="border-[#2196f3] text-[#2196f3]">
                            <Filter className="mr-2 h-4 w-4" />
                            {scoreFilter === 'all' ? 'Filter' : 
                             scoreFilter === 'excellent' ? 'Excellent (800+)' :
                             scoreFilter === 'good' ? 'Good (700-799)' :
                             scoreFilter === 'fair' ? 'Fair (600-699)' :
                             scoreFilter === 'poor' ? 'Poor (Below 600)' :
                             scoreFilter === 'flagged' ? 'Flagged Scores' : 'Filter'}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem 
                            onClick={() => applyFilter('all')}
                            className={scoreFilter === 'all' ? 'bg-[#f0f7f4] dark:bg-[#1a4a38]' : ''}
                          >
                            All Scores
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => applyFilter('excellent')}
                            className={scoreFilter === 'excellent' ? 'bg-[#f0f7f4] dark:bg-[#1a4a38]' : ''}
                          >
                            Excellent (800+)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => applyFilter('good')}
                            className={scoreFilter === 'good' ? 'bg-[#f0f7f4] dark:bg-[#1a4a38]' : ''}
                          >
                            Good (700-799)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => applyFilter('fair')}
                            className={scoreFilter === 'fair' ? 'bg-[#f0f7f4] dark:bg-[#1a4a38]' : ''}
                          >
                            Fair (600-699)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => applyFilter('poor')}
                            className={scoreFilter === 'poor' ? 'bg-[#f0f7f4] dark:bg-[#1a4a38]' : ''}
                          >
                            Poor (Below 600)
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => applyFilter('flagged')}
                            className={scoreFilter === 'flagged' ? 'bg-[#f0f7f4] dark:bg-[#1a4a38]' : ''}
                          >
                            Flagged Scores
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      {scoreFilter !== 'all' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => applyFilter('all')}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Clear Filter
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border border-[#1a4a38]">
                  <Table>
                    <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
                      <TableRow>
                        <TableHead className="font-semibold">User</TableHead>
                        <TableHead className="font-semibold">Score</TableHead>
                        <TableHead className="font-semibold">Factors</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Last Updated</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-[#2196f3]" />
                            Loading credit reports...
                          </TableCell>
                        </TableRow>
                      ) : creditReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="text-gray-500">
                              <Filter className="h-8 w-8 mx-auto mb-2" />
                              {scoreFilter !== 'all' ? `No credit reports found for ${scoreFilter} filter` : 'No credit reports found'}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        <>
                      {creditReports.map((report) => (
                        <TableRow key={report.id} className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="bg-[#2196f3] text-white h-8 w-8 rounded-full flex items-center justify-center mr-3">
                                <User className="h-4 w-4" />
                              </div>
                              <div>
                                    <div>{report.user ? `${report.user.firstName || ''} ${report.user.lastName || ''}`.trim() : 'N/A'}</div>
                                <div className="text-sm text-gray-600 dark:text-[#a8d5ba]">
                                      {report.user ? report.user.email : 'N/A'}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                                  <span className="font-bold mr-2">
                                    {Number.isFinite(report.creditScore?.fico?.score)
                                      ? report.creditScore.fico.score
                                      : Number.isFinite(report.score)
                                        ? report.score
                                        : 'N/A'}
                                  </span>
                              <Badge 
                                className={
                                      (report.creditScore?.fico?.score ?? report.score ?? 0) >= 800 
                                    ? 'bg-[#4caf50] text-white' 
                                        : (report.creditScore?.fico?.score ?? report.score ?? 0) >= 700 
                                    ? 'bg-[#8bc34a] text-white'
                                        : (report.creditScore?.fico?.score ?? report.score ?? 0) >= 600
                                    ? 'bg-[#ffd54f] text-[#0d261c]'
                                    : 'bg-[#f44336] text-white'
                                }
                              >
                                {report.status || 'N/A'}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            <div className="grid grid-cols-2 gap-1">
                              <div className="flex items-center">
                                <span className="text-gray-600 dark:text-gray-400 mr-1">Payment:</span>
                                <span className="font-medium">{report.paymentHistory || 'N/A'}</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-gray-600 dark:text-gray-400 mr-1">Utilization:</span>
                                <span className="font-medium">{report.creditUtilization || 'N/A'}%</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-gray-600 dark:text-gray-400 mr-1">History:</span>
                                <span className="font-medium">{report.creditHistory || 'N/A'} yrs</span>
                              </div>
                              <div className="flex items-center">
                                <span className="text-gray-600 dark:text-gray-400 mr-1">Inquiries:</span>
                                <span className="font-medium">{report.recentInquiries || 'N/A'}</span>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {report.flagged ? (
                              <Badge className="bg-red-100 text-red-800">
                                <Flag className="h-4 w-4 mr-1" />
                                Flagged
                              </Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                Normal
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-gray-600 dark:text-[#a8d5ba]">
                            {report.lastUpdated ? format(new Date(report.lastUpdated), 'MMM d, yyyy h:mm a') : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem onClick={() => navigate(`/admin/credit-reports/${report.id}`)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <RefreshCw className="mr-2 h-4 w-4" />
                                  Recalculate
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Annotate
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Flag className="mr-2 h-4 w-4" />
                                  {report.flagged ? 'Unflag' : 'Flag'}
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Download className="mr-2 h-4 w-4" />
                                  Export Report
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                        </>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batch Uploads */}
          {activeTab === 'batch-uploads' && (
            <div className="space-y-6">
              <Card className="border border-[#1a4a38]">
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
              
              <Card className="border border-[#1a4a38]">
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
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Lending Decision Logs</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      Review approval/rejection decisions and overrides
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      className="bg-[#9c27b0] hover:bg-[#7b1fa2] text-white"
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export Logs
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="border-[#9c27b0] text-[#9c27b0]">
                          <Filter className="mr-2 h-4 w-4" />
                          Filter
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Approved</DropdownMenuItem>
                        <DropdownMenuItem>Rejected</DropdownMenuItem>
                        <DropdownMenuItem>Manual Overrides</DropdownMenuItem>
                        <DropdownMenuItem>Recent Decisions</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
                    <TableRow>
                      <TableHead className="font-semibold">Applicant</TableHead>
                      <TableHead className="font-semibold">Decision</TableHead>
                      <TableHead className="font-semibold">Score</TableHead>
                      <TableHead className="font-semibold">Reason</TableHead>
                      <TableHead className="font-semibold">Officer</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lendingLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin text-[#9c27b0]" />
                          Loading lending decisions...
                      </TableCell>
                    </TableRow>
                    ) : lendingDecisions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="text-gray-500">
                            <Filter className="h-8 w-8 mx-auto mb-2" />
                            No lending decisions found
                          </div>
                      </TableCell>
                    </TableRow>
                    ) : (
                      <>
                        {lendingDecisions.map((decision) => (
                          <TableRow key={decision.id} className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                            <TableCell className="font-medium">{decision.applicant}</TableCell>
                      <TableCell>
                              <Badge className={`${decision.decision === 'Approved' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {decision.decision}
                          </Badge>
                      </TableCell>
                            <TableCell>{decision.score}</TableCell>
                            <TableCell className="max-w-xs">{decision.reason}</TableCell>
                            <TableCell>{decision.officer}</TableCell>
                            <TableCell>{format(new Date(decision.date), 'MMM d, yyyy')}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                        ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Data Tools */}
          {activeTab === 'data-tools' && (
            <div className="space-y-6">
              <Card className="border border-[#1a4a38]">
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
              
              <Card className="border border-[#1a4a38]">
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
                            className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${selectedAdmin && selectedAdmin._id === admin._id ? 'bg-[#e0efe9] dark:bg-[#1a4a38] font-bold' : 'hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]'}`}
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

          {/* Analytics */}
          {activeTab === 'analytics' && (
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Analytics Dashboard</CardTitle>
                <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                  Comprehensive insights into credit performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="border border-[#1a4a38] rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Score Distribution</h3>
                    <div className="bg-gray-100 dark:bg-[#1a4a38] h-64 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">Score distribution chart visualization</span>
                    </div>
                  </div>
                  <div className="border border-[#1a4a38] rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Approval Rate Trends</h3>
                    <div className="bg-gray-100 dark:bg-[#1a4a38] h-64 rounded-lg flex items-center justify-center">
                      <span className="text-gray-500">Approval rate trend chart visualization</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border border-[#1a4a38]">
                    <CardHeader>
                      <CardTitle className="text-lg">Rejection Reasons</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {analyticsData.rejectionReasons ? Object.entries(analyticsData.rejectionReasons).map(([reason, percentage], index) => (
                          <div key={reason}>
                          <div className="flex justify-between mb-1">
                              <span>{reason}</span>
                              <span>{percentage}%</span>
                          </div>
                          <div className="h-2 bg-gray-200 rounded-full">
                              <div 
                                className="h-2 rounded-full" 
                                style={{ 
                                  width: `${percentage}%`,
                                  backgroundColor: ['#f44336', '#ff9800', '#ffc107', '#4caf50', '#2196f3'][index % 5]
                                }}
                              ></div>
                          </div>
                        </div>
                        )) : (
                          <div className="text-center text-gray-500 py-8">
                            <RefreshCw className="h-8 w-8 mx-auto mb-2 animate-spin" />
                            Loading rejection data...
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-[#1a4a38]">
                    <CardHeader>
                      <CardTitle className="text-lg">Score by Region</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Region</TableHead>
                            <TableHead className="text-right">Avg. Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analyticsData.regionalScores ? Object.entries(analyticsData.regionalScores).map(([region, score]) => (
                            <TableRow key={region}>
                              <TableCell>{region}</TableCell>
                              <TableCell className="text-right">{score}</TableCell>
                          </TableRow>
                          )) : (
                          <TableRow>
                              <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                                <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                                Loading regional data...
                              </TableCell>
                          </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                  
                  <Card className="border border-[#1a4a38]">
                    <CardHeader>
                      <CardTitle className="text-lg">Score by Occupation</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Occupation</TableHead>
                            <TableHead className="text-right">Avg. Score</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {analyticsData.occupationScores ? Object.entries(analyticsData.occupationScores).map(([occupation, score]) => (
                            <TableRow key={occupation}>
                              <TableCell>{occupation}</TableCell>
                              <TableCell className="text-right">{score}</TableCell>
                          </TableRow>
                          )) : (
                          <TableRow>
                              <TableCell colSpan={2} className="text-center text-gray-500 py-4">
                                <RefreshCw className="h-6 w-6 mx-auto mb-2 animate-spin" />
                                Loading occupation data...
                              </TableCell>
                          </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fraud Detection */}
          {activeTab === 'fraud' && (
            <FraudDetectionPanel />
          )}

          {/* Scoring Engine */}
          {activeTab === 'scoring-engine' && (
            <ScoringEngineControl />
          )}

          {/* AI Settings */}
          {activeTab === 'ai-settings' && (
            <AISettingsPanel />
          )}

          {/* Compliance */}
          {activeTab === 'compliance' && (
            <CompliancePanel />
          )}

          {/* Access Control */}
          {activeTab === 'access-control' && (
            <RoleManagement />
          )}

          {/* Notifications */}
          {activeTab === 'notifications' && (
            <NotificationCenter />
          )}

          {/* Support Center */}
          {activeTab === 'support' && (
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <CardTitle className="text-gray-900 dark:text-white">Support Center</CardTitle>
                <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                  Internal communication and ticket management
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 border border-[#1a4a38] rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Active Tickets</h3>
                    <div className="space-y-4">
                      <div className="border-b border-[#1a4a38] pb-4">
                        <div className="flex justify-between">
                          <span className="font-medium">Password Reset Issue</span>
                          <Badge className="bg-yellow-100 text-yellow-800">Open</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User: emma@example.com</p>
                        <p className="text-sm mt-2">User unable to reset password despite multiple attempts...</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">Assigned to: You</span>
                          <span className="text-xs text-gray-500">2 days ago</span>
                        </div>
                      </div>
                      <div className="border-b border-[#1a4a38] pb-4">
                        <div className="flex justify-between">
                          <span className="font-medium">Score Discrepancy</span>
                          <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User: michael@example.com</p>
                        <p className="text-sm mt-2">User reports credit score different from other bureaus...</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">Assigned to: Sarah Johnson</span>
                          <span className="text-xs text-gray-500">1 day ago</span>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between">
                          <span className="font-medium">Document Upload Failure</span>
                          <Badge className="bg-purple-100 text-purple-800">New</Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">User: david@example.com</p>
                        <p className="text-sm mt-2">User unable to upload identity verification documents...</p>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">Unassigned</span>
                          <span className="text-xs text-gray-500">3 hours ago</span>
                        </div>
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-[#009688] hover:bg-[#00796b] text-white">
                      <Plus className="mr-2 h-4 w-4" />
                      New Ticket
                    </Button>
                  </div>
                  
                  <div className="lg:col-span-2 border border-[#1a4a38] rounded-lg p-4">
                    <h3 className="font-semibold mb-4">Ticket Conversation</h3>
                    <div className="border border-[#1a4a38] rounded-lg p-4 h-96 overflow-y-auto mb-4">
                      <div className="space-y-4">
                        <div className="flex justify-end">
                          <div className="bg-[#e0f2f1] dark:bg-[#1a4a38] rounded-lg p-3 max-w-md">
                            <p>Hi Emma, we've reset your password on our end. Please try logging in with your new temporary password: TempPass123. You'll be prompted to change it after login.</p>
                            <p className="text-xs text-gray-500 mt-2">You - Today at 10:30 AM</p>
                          </div>
                        </div>
                        <div className="flex">
                          <div className="bg-[#f5f5f5] dark:bg-[#0d261c] rounded-lg p-3 max-w-md">
                            <p>Thanks for your help! I was able to log in and change my password. Everything seems to be working now.</p>
                            <p className="text-xs text-gray-500 mt-2">Emma Wilson - Today at 10:45 AM</p>
                          </div>
                        </div>
                        <div className="flex justify-end">
                          <div className="bg-[#e0f2f1] dark:bg-[#1a4a38] rounded-lg p-3 max-w-md">
                            <p>Great to hear! Is there anything else I can help you with today?</p>
                            <p className="text-xs text-gray-500 mt-2">You - Today at 10:46 AM</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input placeholder="Type your message..." />
                      <Button className="bg-[#009688] hover:bg-[#00796b] text-white">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* System Monitor */}
          {activeTab === 'system' && (
            <SystemMonitor />
          )}
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
  );
};

export default AdminDashboard;
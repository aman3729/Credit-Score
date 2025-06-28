import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { 
  Users, 
  CreditCard, 
  History, 
  User, 
  Settings, 
  LogOut, 
  Search, 
  Bell, 
  UserPlus, 
  Upload, 
  MoreHorizontal,
  FileText,
  Download,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  BarChart2,
  Plus,
  TrendingUp
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

// Custom Components
import RegisterUser from './admin/RegisterUser';
import AdminBatchUpload from './AdminBatchUpload';
import UploadHistory from './admin/UploadHistory';
import UserDataViewer from './admin/UserDataViewer';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';

// Primary color and complementary palette
const PRIMARY_COLOR = '#0d261c';
const PRIMARY_LIGHT = '#1a4a38';
const SECONDARY_COLOR = '#8bc34a';
const ACCENT_COLOR = '#ffd54f';
const LIGHT_BG = '#f0f7f4';
const DARK_BG = '#0a1d15';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, logout } = useAuth();
  
  // State
  const [activeTab, setActiveTab] = useState('users');
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

  // Fetch users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users');
      // Handle paginated response format
      setUsers(response.data.data || response.data);
      
      // Update pagination if available
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

  // Fetch credit reports
  const fetchCreditReports = useCallback(async (page = 1, search = '') => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {
        page,
        limit: 10,
        search
      };
      
      const response = await api.get('/admin/credit-reports', { params });
      
      if (response.data.success) {
        const { data, pagination } = response.data;
        setCreditReports(data);
        setPagination({
          current: pagination.page,
          pageSize: pagination.limit,
          total: pagination.total,
          totalPages: pagination.pages
        });
      } else {
        throw new Error(response.data.error || 'Failed to fetch credit reports');
      }
    } catch (err) {
      console.error('Error fetching credit reports:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Failed to fetch credit reports';
      setError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
      
      if (err.response?.status === 401 || err.response?.status === 403) {
        logout();
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  }, [navigate, logout, toast]);

  // Initial data fetch
  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'credit-reports') {
      fetchCreditReports();
    }
  }, [activeTab, fetchUsers, fetchCreditReports]);

  // Handle batch upload completion
  const handleUploadComplete = useCallback((uploadData) => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'credit-reports') {
      fetchCreditReports();
    }
    
    toast({
      title: 'Upload Complete',
      description: `Successfully processed ${uploadData.successCount} records`,
    });
  }, [activeTab, fetchUsers, fetchCreditReports, toast]);

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="animate-spin h-16 w-16 border-t-4 border-b-4 border-[#8bc34a] rounded-full mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading dashboard...</p>
      </div>
    );
  }

  // Error state
  if (error) {
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
              onClick={activeTab === 'users' ? fetchUsers : fetchCreditReports}
            >
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a1d15]">
      {/* Navigation Sidebar */}
      <div 
        className="fixed left-0 top-0 h-full w-64 bg-[#0d261c] dark:bg-[#0d261c] border-r border-[#1a4a38] z-10"
        style={{ backgroundColor: PRIMARY_COLOR }}
      >
        <div className="p-5 border-b border-[#1a4a38]">
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
            <button 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${
                activeTab === 'users' 
                  ? 'bg-[#1a4a38] text-white' 
                  : 'text-[#a8d5ba] hover:bg-[#1a4a38]'
              }`}
              onClick={() => setActiveTab('users')}
            >
              <Users className="h-5 w-5 mr-3" />
              User Management
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>
            
            <button 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${
                activeTab === 'credit-reports' 
                  ? 'bg-[#1a4a38] text-white' 
                  : 'text-[#a8d5ba] hover:bg-[#1a4a38]'
              }`}
              onClick={() => setActiveTab('credit-reports')}
            >
              <FileText className="h-5 w-5 mr-3" />
              Credit Reports
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>
            
            <button 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${
                activeTab === 'upload-history' 
                  ? 'bg-[#1a4a38] text-white' 
                  : 'text-[#a8d5ba] hover:bg-[#1a4a38]'
              }`}
              onClick={() => setActiveTab('upload-history')}
            >
              <History className="h-5 w-5 mr-3" />
              Upload History
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>
            
            <button 
              className={`flex items-center px-4 py-3 rounded-lg transition-colors w-full text-left ${
                activeTab === 'user-data' 
                  ? 'bg-[#1a4a38] text-white' 
                  : 'text-[#a8d5ba] hover:bg-[#1a4a38]'
              }`}
              onClick={() => setActiveTab('user-data')}
            >
              <BarChart2 className="h-5 w-5 mr-3" />
              User Analytics
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>
            
            <button className="flex items-center px-4 py-3 rounded-lg text-[#a8d5ba] hover:bg-[#1a4a38] transition-colors w-full text-left">
              <Settings className="h-5 w-5 mr-3" />
              Settings
              <ChevronRight className="h-4 w-4 ml-auto" />
            </button>
          </nav>
        </div>
        
        <div className="absolute bottom-0 left-0 w-full p-4 border-t border-[#1a4a38]">
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
      <div className="ml-64 p-6">
        {/* Top Navigation */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {activeTab === 'users' && 'User Management'}
              {activeTab === 'credit-reports' && 'Credit Reports'}
              {activeTab === 'upload-history' && 'Upload History'}
              {activeTab === 'user-data' && 'User Analytics'}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              {activeTab === 'users' && 'Manage system users and their permissions'}
              {activeTab === 'credit-reports' && 'View and manage user credit reports'}
              {activeTab === 'upload-history' && 'Track batch upload history and status'}
              {activeTab === 'user-data' && 'Analyze user credit data and trends'}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                type="text" 
                placeholder="Search..." 
                className="pl-10 w-64 bg-white dark:bg-[#0d261c] border border-[#1a4a38]"
              />
            </div>
            
            <button className="p-2 rounded-full bg-white dark:bg-[#0d261c] border border-[#1a4a38] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
              <Bell className="h-5 w-5 text-gray-600 dark:text-[#a8d5ba]" />
            </button>
            
            <div className="flex items-center space-x-3">
              <div className="bg-[#8bc34a] text-white h-9 w-9 rounded-full flex items-center justify-center">
                <User className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{user?.name || 'Admin'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Administrator</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-r from-[#f0f7f4] to-[#e0efe9] dark:from-[#1a4a38] dark:to-[#0d261c] border border-[#1a4a38]">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-[#a8d5ba]">Total Users</p>
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">1,248</h3>
                </div>
                <div className="bg-[#8bc34a] text-white p-3 rounded-lg">
                  <Users className="h-6 w-6" />
                </div>
              </div>
              <div className="flex items-center text-sm text-[#4caf50] mt-2">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>12.5% increase</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-[#f0f7f4] to-[#e0efe9] dark:from-[#1a4a38] dark:to-[#0d261c] border border-[#1a4a38]">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-[#a8d5ba]">Credit Reports</p>
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">5,782</h3>
                </div>
                <div className="bg-[#8bc34a] text-white p-3 rounded-lg">
                  <FileText className="h-6 w-6" />
                </div>
              </div>
              <div className="flex items-center text-sm text-[#4caf50] mt-2">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>8.3% increase</span>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-[#f0f7f4] to-[#e0efe9] dark:from-[#1a4a38] dark:to-[#0d261c] border border-[#1a4a38]">
            <CardContent className="p-6">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600 dark:text-[#a8d5ba]">Avg. Credit Score</p>
                  <h3 className="text-2xl font-bold mt-1 dark:text-white">721</h3>
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
        </div>
        
        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-white dark:bg-[#0d261c] p-1 rounded-lg border border-[#1a4a38]">
            <TabsTrigger 
              value="users" 
              className="px-4 py-2 rounded-md data-[state=active]:bg-[#8bc34a] data-[state=active]:text-white"
            >
              <Users className="h-4 w-4 mr-2" />
              Users
            </TabsTrigger>
            <TabsTrigger 
              value="credit-reports" 
              className="px-4 py-2 rounded-md data-[state=active]:bg-[#8bc34a] data-[state=active]:text-white"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Credit Reports
            </TabsTrigger>
            <TabsTrigger 
              value="upload-history" 
              className="px-4 py-2 rounded-md data-[state=active]:bg-[#8bc34a] data-[state=active]:text-white"
            >
              <History className="h-4 w-4 mr-2" />
              Upload History
            </TabsTrigger>
            <TabsTrigger 
              value="user-data" 
              className="px-4 py-2 rounded-md data-[state=active]:bg-[#8bc34a] data-[state=active]:text-white"
            >
              <User className="h-4 w-4 mr-2" />
              User Data
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
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
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
                    <TableRow>
                      <TableHead className="font-semibold">Name</TableHead>
                      <TableHead className="font-semibold">Email</TableHead>
                      <TableHead className="font-semibold">Role</TableHead>
                      <TableHead className="font-semibold">Credit Score</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Last Login</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user._id} className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                        <TableCell className="font-medium flex items-center">
                          <div className="bg-[#8bc34a] text-white h-8 w-8 rounded-full flex items-center justify-center mr-3">
                            <User className="h-4 w-4" />
                          </div>
                          {user.name}
                        </TableCell>
                        <TableCell>{user.email}</TableCell>
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
                        <TableCell>
                          <Badge 
                            className={user.active ? 'bg-[#4caf50] text-white' : 'bg-gray-200 text-gray-700'}
                          >
                            {user.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-gray-600 dark:text-[#a8d5ba]">
                          {user.lastLogin ? format(new Date(user.lastLogin), 'PPpp') : 'Never'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="credit-reports">
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">Credit Reports</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      View and manage user credit reports
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      className="bg-[#8bc34a] hover:bg-[#7cb342] text-white"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Generate Report
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
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
                        className="border-[#8bc34a] text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                      >
                        <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                        Refresh
                      </Button>
                    </div>
                  </div>
                </div>
                
                <div className="rounded-md border border-[#1a4a38]">
                  <Table>
                    <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
                      <TableRow>
                        <TableHead className="font-semibold">User</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Score</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Last Updated</TableHead>
                        <TableHead className="text-right font-semibold">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading && creditReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <Loader2 className="h-8 w-8 text-gray-400 animate-spin mb-2" />
                              <p className="text-gray-500">Loading credit reports...</p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : error && creditReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
                              <p className="text-red-500 mb-2">Failed to load credit reports</p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchCreditReports(pagination.current, searchQuery)}
                                className="border-[#8bc34a] text-[#8bc34a]"
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Try Again
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : creditReports.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8">
                            <div className="flex flex-col items-center justify-center">
                              <FileText className="h-8 w-8 text-gray-400 mb-2" />
                              <p className="text-gray-500">No credit reports found</p>
                              {searchQuery && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mt-2 text-[#8bc34a]"
                                  onClick={() => {
                                    setSearchQuery('');
                                    fetchCreditReports(1, '');
                                  }}
                                >
                                  Clear search
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        creditReports.map((report) => (
                          <TableRow key={report.id} className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="bg-[#8bc34a] text-white h-8 w-8 rounded-full flex items-center justify-center mr-3">
                                  <User className="h-4 w-4" />
                                </div>
                                <div>
                                  <div className="font-medium">{report.userName || 'N/A'}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-[#a8d5ba]">
                              {report.userEmail || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center">
                                <span className="font-bold mr-2">{report.score}</span>
                                <Badge 
                                  className={
                                    report.score >= 800 
                                      ? 'bg-[#4caf50] text-white' 
                                      : report.score >= 740 
                                      ? 'bg-[#8bc34a] text-white'
                                      : report.score >= 670
                                      ? 'bg-[#ffd54f] text-[#0d261c]'
                                      : 'bg-[#f44336] text-white'
                                  }
                                >
                                  {report.status || 'N/A'}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge 
                                className={
                                  report.status === 'excellent' || report.status === 'very good' 
                                    ? 'bg-[#4caf50] text-white' 
                                    : report.status === 'good' 
                                    ? 'bg-[#8bc34a] text-white'
                                    : report.status === 'fair'
                                    ? 'bg-[#ffd54f] text-[#0d261c]'
                                    : 'bg-[#f44336] text-white'
                                }
                              >
                                {report.status ? report.status.charAt(0).toUpperCase() + report.status.slice(1) : 'N/A'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-gray-600 dark:text-[#a8d5ba]">
                              {report.lastUpdated ? format(new Date(report.lastUpdated), 'MMM d, yyyy h:mm a') : 'N/A'}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="relative inline-block text-left">
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-8 w-8 p-0 text-[#8bc34a]"
                                  onClick={() => navigate(`/admin/users/${report.userId}/credit-report`)}
                                  aria-label="View details"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                  <span className="sr-only">View details</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  
                  {pagination.total > 0 && (
                    <div className="flex items-center justify-between px-6 py-4 border-t border-[#1a4a38]">
                      <div className="text-sm text-gray-600 dark:text-[#a8d5ba]">
                        Showing <span className="font-medium">{(pagination.current - 1) * pagination.pageSize + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(pagination.current * pagination.pageSize, pagination.total)}
                        </span>{' '}
                        of <span className="font-medium">{pagination.total}</span> results
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchCreditReports(pagination.current - 1, searchQuery)}
                          disabled={pagination.current === 1 || loading}
                          className="border-[#8bc34a] text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchCreditReports(pagination.current + 1, searchQuery)}
                          disabled={pagination.current >= pagination.totalPages || loading}
                          className="border-[#8bc34a] text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="upload-history">
            <UploadHistory />
          </TabsContent>

          <TabsContent value="user-data">
            <Card className="border border-[#1a4a38]">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <CardTitle className="text-gray-900 dark:text-white">User Credit Data</CardTitle>
                    <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
                      View detailed credit information for any user
                    </CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button 
                      className="bg-[#8bc34a] hover:bg-[#7cb342] text-white"
                    >
                      <BarChart2 className="mr-2 h-4 w-4" />
                      Export Data
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <UserDataViewer />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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
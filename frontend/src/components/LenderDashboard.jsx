import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User, CreditCard, AlertCircle, CheckCircle2, XCircle, Info, ChevronDown, Edit, Save, AlertTriangle } from 'lucide-react';

// UI Components
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { useToast } from '../hooks/use-toast';
import { useAuth } from "../contexts/AuthContext";
import { api } from "../lib/api";

// Status badge colors
const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
};

const LenderDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
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
  const searchTimeoutRef = useRef(null);

  // Decision badge colors and icons
  const decisionConfig = {
    Approve: {
      color: 'bg-green-100 text-green-800 border-green-200',
      icon: CheckCircle2,
      label: 'Approved'
    },
    Review: {
      color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: AlertCircle,
      label: 'Needs Review'
    },
    Reject: {
      color: 'bg-red-100 text-red-800 border-red-200',
      icon: XCircle,
      label: 'Rejected'
    },
    default: {
      color: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: Info,
      label: 'Pending'
    }
  };

  // Search users with debounce
  const searchUsers = useCallback(async (query = '') => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Using admin users endpoint with lender role
      const response = await api.get(`/admin/users?search=${encodeURIComponent(query)}`);
      const usersList = Array.isArray(response.data.data) ? response.data.data : [];
      
      // Fetch credit data for each user to get lending decisions
      const usersWithCreditData = await Promise.all(
        usersList.map(async (user) => {
          try {
            console.log(`Fetching credit data for user: ${user._id}`);
            const creditResponse = await api.get(`/users/${user._id}/credit-data`);
            
            // Log the complete response for debugging
            console.log(`Credit data for user ${user._id}:`, creditResponse.data);
            
            // Handle both response structures: { data: {...} } and direct data
            const responseData = creditResponse.data.data || creditResponse.data;
            
            // Extract credit score and lending decision
            const creditScore = responseData.currentScore || 
                              (responseData.creditScores && responseData.creditScores[0]?.score) || 
                              'N/A';
                              
            // Get lending decision or create a default one based on score
            let lendingDecision = responseData.lendingDecision;
            
            if (!lendingDecision) {
              // Create a default lending decision based on score if none exists
              const score = Number(creditScore);
              if (!isNaN(score)) {
                lendingDecision = {
                  decision: score >= 700 ? 'Approve' : score >= 600 ? 'Review' : 'Reject',
                  reasons: [
                    score >= 700 ? 'Good credit score' : 
                    score >= 600 ? 'Moderate credit score' : 'Low credit score'
                  ],
                  recommendations: [
                    score >= 700 ? 'Eligible for best rates' :
                    score >= 600 ? 'Review terms carefully' : 'Consider secured options'
                  ]
                };
              } else {
                // Fallback if we can't determine a score
                lendingDecision = {
                  decision: 'Review',
                  reasons: ['Complete credit assessment required'],
                  recommendations: ['Review application manually']
                };
              }
            }
            
            return {
              ...user,
              creditScore,
              lendingDecision
            };
            
          } catch (creditErr) {
            console.error(`Error fetching credit data for user ${user._id}:`, creditErr);
            return {
              ...user,
              creditScore: user.creditScore || 'N/A', // Keep existing score if any
              lendingDecision: {
                decision: 'Review',
                reasons: ['Error loading credit data'],
                recommendations: ['Check user details']
              }
            };
          }
        })
      );
      
      setUsers(usersWithCreditData);
      
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Failed to search users');
      
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
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout
    searchTimeoutRef.current = setTimeout(() => {
      searchUsers(query);
    }, 500);
  };

  // Fetch user credit data with detailed error handling and logging
  const fetchUserCreditData = async (userId) => {
    if (!userId) {
      const errorMsg = 'No user ID provided to fetchUserCreditData';
      console.error(errorMsg);
      setCreditDataError(errorMsg);
      return;
    }

    const startTime = Date.now();
    console.log(`[${new Date().toISOString()}] Starting credit data fetch for user:`, userId);
    
    try {
      setLoadingCreditData(true);
      setCreditDataError(null);
      
      // Log the exact URL being called
      const apiUrl = `/users/${userId}/credit-data`;
      const timestamp = new Date().getTime(); // Cache buster
      const urlWithCacheBuster = `${apiUrl}?_=${timestamp}`;
      
      console.log(`[${new Date().toISOString()}] API Request:`, {
        method: 'GET',
        url: urlWithCacheBuster,
        userId,
        timestamp: new Date().toISOString()
      });
      
      // Add cache-control headers to prevent caching
      const response = await api.get(urlWithCacheBuster, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      const requestDuration = Date.now() - startTime;
      
      // Log complete response for debugging
      console.log(`[${new Date().toISOString()}] Complete API Response (${requestDuration}ms):`, {
        status: response.status,
        statusText: response.statusText,
        config: response.config,
        hasData: !!response.data,
        responseData: response.data || 'No data in response'
      });
      
      if (!response.data) {
        const errorMsg = 'No data in response';
        console.error(errorMsg, { response });
        throw new Error(errorMsg);
      }
      
      // The backend returns data in response.data.data
      const responseData = response.data.data || response.data;
      
      // Log the structure of the response data
      console.log(`[${new Date().toISOString()}] Response data structure:`, {
        responseKeys: Object.keys(response.data),
        dataKeys: responseData ? Object.keys(responseData) : 'No data',
        hasUser: !!(responseData?.user),
        hasCurrentScore: responseData?.currentScore !== undefined,
        hasCreditScores: Array.isArray(responseData?.creditScores) && responseData.creditScores.length > 0,
        hasCreditReport: !!responseData?.creditReport,
        hasLendingDecision: !!responseData?.lendingDecision
      });
      
      if (!responseData) {
        throw new Error('No data received from server');
      }
      
      // Format the data for the frontend
      const formattedData = {
        ...responseData,
        // Map the backend fields to the frontend expected structure
        currentScore: responseData.currentScore,
        creditReport: responseData.creditReport || responseData.creditScores?.[0] || null,
        lendingDecision: responseData.lendingDecision || {
          decision: responseData.currentScore >= 700 ? 'Approve' : 'Review',
          reasons: responseData.currentScore >= 700 
            ? ['Good credit score'] 
            : ['Insufficient credit history'],
          recommendations: responseData.currentScore >= 700
            ? ['Eligible for premium rates']
            : ['Consider adding more credit history']
        },
        // Include raw response for debugging
        _rawResponse: response.data,
        _responseStatus: response.status
      };
      
      console.log('Formatted credit data:', {
        ...formattedData,
        // Truncate large objects for logging
        creditScores: Array.isArray(formattedData.creditScores) 
          ? `[${formattedData.creditScores.length} items]` 
          : 'No credit scores',
        creditReport: formattedData.creditReport ? '[CreditReport]' : 'No credit report',
        _rawResponse: '[Raw response]'
      });
      
      setUserCreditData(formattedData);
      
      // Log a warning if we have credit scores but no current score
      if (Array.isArray(responseData.creditScores) && responseData.creditScores.length > 0 && !responseData.currentScore) {
        console.warn('Credit scores exist but no current score found');
      }
      
    } catch (err) {
      const errorDetails = {
        message: err.message,
        name: err.name,
        stack: err.stack,
        response: {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          headers: err.response?.headers
        },
        config: {
          url: err.config?.url,
          method: err.config?.method,
          headers: err.config?.headers,
          params: err.config?.params
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime
      };
      
      console.error('[ERROR] Error fetching credit data:', errorDetails);
      
      const errorMessage = err.response?.data?.error || 
                         err.message || 
                         'Failed to load credit data';
      
      setCreditDataError(errorMessage);
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      console.log(`[${new Date().toISOString()}] Finished credit data fetch for user ${userId} in ${Date.now() - startTime}ms`);
      setLoadingCreditData(false);
    }
  };

  // Handle user selection with detailed logging
  const handleUserSelect = (user) => {
    console.log('User selected:', {
      userId: user._id,
      userName: user.name,
      userEmail: user.email
    });
    
    // Reset previous state
    setUserCreditData(null);
    setCreditDataError(null);
    
    // Set the selected user which will open the modal
    setSelectedUser(user);
    
    // Fetch the credit data for this user
    console.log('Initiating credit data fetch for user:', user._id);
    fetchUserCreditData(user._id);
  };

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setUsers([]);
    setSelectedUser(null);
    setUserCreditData(null);
  };

  // Close credit data modal
  const closeCreditDataModal = useCallback(() => {
    setSelectedUser(null);
    setUserCreditData(null);
    setCreditDataError('');
    setIsEditingDecision(false);
    setManualDecision({
      decision: '',
      notes: '',
      amount: '',
      term: '',
      interestRate: ''
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  // Render decision badge
  const renderDecisionBadge = (decision, size = 'default') => {
    const baseClasses = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';
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
    setManualDecision(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Save manual decision
  const saveManualDecision = () => {
    // In a real app, you would save this to your backend
    console.log('Saving manual decision:', manualDecision);
    
    // Update the local state to reflect the manual decision
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
    
    // Exit edit mode
    setIsEditingDecision(false);
    
    // Show success message
    toast.success('Lending decision saved successfully');
  };

  // Start editing the decision
  const startEditingDecision = () => {
    setManualDecision({
      decision: userCreditData?.lendingDecision?.decision || 'review',
      notes: userCreditData?.lendingDecision?.manualNotes || '',
      amount: userCreditData?.lendingDecision?.loanDetails?.amount || '',
      term: userCreditData?.lendingDecision?.loanDetails?.term || '',
      interestRate: userCreditData?.lendingDecision?.loanDetails?.interestRate || ''
    });
    setIsEditingDecision(true);
  };

  return (
    <div className="container mx-auto p-4">
      {/* Search Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow mb-6">
        <div className="flex items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users by name or email..."
              className="pl-10 w-full"
              value={searchQuery}
              onChange={handleSearch}
            />
          </div>
          <Button 
            variant="outline" 
            className="ml-2"
            onClick={clearSearch}
            disabled={!searchQuery}
          >
            Clear
          </Button>
        </div>
      </div>

      {/* Search Results */}
      {loading ? (
        <div className="flex justify-center items-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500 mr-2" />
          <span className="text-gray-600 dark:text-gray-300">Searching users...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : users.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>User Search Results</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Credit Score</TableHead>
                  <TableHead>Lending Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow 
                    key={user._id} 
                    className="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => handleUserSelect(user)}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-2 text-gray-500" />
                        {user.name || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={statusColors[user.status] || 'bg-gray-100 text-gray-800'}
                      >
                        {user.status || 'inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-gray-500" />
                        {user.creditScore || 'N/A'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {user.lendingDecision ? (
                          <div className="flex items-center">
                            {renderDecisionBadge(user.lendingDecision.decision || 'Review')}
                            {user.lendingDecision.decision === 'Review' && user.lendingDecision.reasons?.[0] && (
                              <span className="ml-1 text-xs text-yellow-600">
                                ({user.lendingDecision.reasons[0]})
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">Loading...</span>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : searchQuery ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500">No users found matching "{searchQuery}"</p>
        </div>
      ) : (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500">Enter a name or email to search for users</p>
        </div>
      )}

      {/* Credit Data Modal */}
      <Dialog open={!!selectedUser} onOpenChange={!loadingCreditData ? closeCreditDataModal : undefined}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          {selectedUser && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  {selectedUser.name || 'User Details'}
                </DialogTitle>
                <DialogDescription>
                  {selectedUser.email}
                </DialogDescription>
              </DialogHeader>
              
              <ScrollArea className="flex-1 pr-4 -mr-4">
                {loadingCreditData ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : creditDataError ? (
                  <div className="space-y-4 p-4">
                    <div className="text-red-500 text-center pb-4">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p className="font-medium">Failed to load credit data</p>
                      <p className="text-sm text-red-400 mt-1">{creditDataError}</p>
                    </div>
                    
                    <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                      <h4 className="font-medium text-sm text-red-700 dark:text-red-300 mb-2">Debug Information:</h4>
                      <div className="text-xs space-y-1">
                        <div><span className="font-semibold">User ID:</span> {selectedUser?._id || 'N/A'}</div>
                        <div><span className="font-semibold">API Status:</span> {userCreditData?._responseStatus || 'No response'}</div>
                        <div><span className="font-semibold">Has Data:</span> {JSON.stringify(!!userCreditData)}</div>
                        <div><span className="font-semibold">Data Keys:</span> {userCreditData ? Object.keys(userCreditData).join(', ') : 'no data'}</div>
                      </div>
                      
                      <div className="mt-4">
                        <h5 className="font-medium text-xs text-red-700 dark:text-red-300 mb-1">Raw API Response:</h5>
                        <div className="bg-white dark:bg-gray-900 p-2 rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-auto">
                          <pre className="text-xs">
                            {JSON.stringify({
                              status: userCreditData?._responseStatus,
                              data: userCreditData?._rawResponse || userCreditData,
                              timestamp: new Date().toISOString()
                            }, null, 2)}
                          </pre>
                        </div>
                      </div>
                      
                      {userCreditData && (
                        <details className="mt-3">
                          <summary className="text-xs text-blue-600 dark:text-blue-400 cursor-pointer">
                            Show full credit data object
                          </summary>
                          <pre className="mt-2 p-2 bg-white dark:bg-gray-900 text-xs rounded overflow-auto max-h-60">
                            {JSON.stringify(userCreditData, (key, value) => {
                              // Skip large objects in the preview
                              if (key === 'creditReport' && value && typeof value === 'object') {
                                return `[CreditReport ${Object.keys(value).join(', ')}]`;
                              }
                              return value;
                            }, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ) : userCreditData?.lendingDecision ? (
                  <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium flex items-center gap-2">
                          Lending Decision
                          {userCreditData.lendingDecision.isManual && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              Manual Override
                            </span>
                          )}
                        </h3>
                        <div className="flex items-center gap-2">
                          {renderDecisionBadge(userCreditData.lendingDecision.decision, 'large')}
                          {!isEditingDecision && (
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={startEditingDecision}
                              className="ml-2"
                            >
                              <Edit className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      {isEditingDecision ? (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium">Decision</h4>
                            <div className="grid grid-cols-3 gap-2">
                              <Button
                                variant={manualDecision.decision === 'Approve' ? 'default' : 'outline'}
                                onClick={() => handleManualDecision('decision', 'Approve')}
                                className="flex-1"
                              >
                                Approve
                              </Button>
                              <Button
                                variant={manualDecision.decision === 'Review' ? 'default' : 'outline'}
                                onClick={() => handleManualDecision('decision', 'Review')}
                                className="flex-1"
                              >
                                Review
                              </Button>
                              <Button
                                variant={manualDecision.decision === 'Reject' ? 'default' : 'outline'}
                                onClick={() => handleManualDecision('decision', 'Reject')}
                                className="flex-1"
                              >
                                Reject
                              </Button>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Loan Amount ($)</label>
                              <Input
                                type="number"
                                value={manualDecision.amount}
                                onChange={(e) => handleManualDecision('amount', e.target.value)}
                                placeholder="e.g. 10000"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Term (months)</label>
                              <Input
                                type="number"
                                value={manualDecision.term}
                                onChange={(e) => handleManualDecision('term', e.target.value)}
                                placeholder="e.g. 36"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Interest Rate (%)</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={manualDecision.interestRate}
                                onChange={(e) => handleManualDecision('interestRate', e.target.value)}
                                placeholder="e.g. 5.5"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-sm font-medium">Notes</label>
                              <Input
                                value={manualDecision.notes}
                                onChange={(e) => handleManualDecision('notes', e.target.value)}
                                placeholder="Add notes about this decision"
                              />
                            </div>
                          </div>
                          
                          <div className="flex justify-end gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              onClick={() => setIsEditingDecision(false)}
                            >
                              Cancel
                            </Button>
                            <Button 
                              onClick={saveManualDecision}
                              disabled={!manualDecision.decision}
                            >
                              <Save className="h-4 w-4 mr-2" />
                              Save Decision
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <h4 className="text-sm font-medium text-gray-500">Decision Details</h4>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-xs text-gray-500">Loan Amount</p>
                                <p className="text-sm font-medium">
                                  {userCreditData.lendingDecision.loanDetails?.amount 
                                    ? `$${Number(userCreditData.lendingDecision.loanDetails.amount).toLocaleString()}` 
                                    : 'Not specified'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Term</p>
                                <p className="text-sm font-medium">
                                  {userCreditData.lendingDecision.loanDetails?.term 
                                    ? `${userCreditData.lendingDecision.loanDetails.term} months` 
                                    : 'Not specified'}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs text-gray-500">Interest Rate</p>
                                <p className="text-sm font-medium">
                                  {userCreditData.lendingDecision.loanDetails?.interestRate 
                                    ? `${userCreditData.lendingDecision.loanDetails.interestRate}%` 
                                    : 'Not specified'}
                                </p>
                              </div>
                            </div>
                            
                            {userCreditData.lendingDecision.manualNotes && (
                              <div className="mt-2">
                                <p className="text-xs text-gray-500">Notes</p>
                                <p className="text-sm mt-1 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                  {userCreditData.lendingDecision.manualNotes}
                                </p>
                              </div>
                            )}
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Reasons</h4>
                            <ul className="space-y-2">
                              {userCreditData.lendingDecision.reasons?.map((reason, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <Info className="h-4 w-4 mt-0.5 text-gray-400 flex-shrink-0" />
                                  <span className="text-sm">{reason}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                          
                          <Separator />
                          
                          <div>
                            <h4 className="text-sm font-medium text-gray-500 mb-2">Recommendations</h4>
                            <ul className="space-y-2">
                              {userCreditData.lendingDecision.recommendations?.map((rec, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <CheckCircle2 className="h-4 w-4 mt-0.5 text-green-500 flex-shrink-0" />
                                  <span className="text-sm">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {userCreditData.currentScore && (
                      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border">
                        <h3 className="text-lg font-medium mb-4">Credit Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-gray-500">Current Score</p>
                            <p className="text-xl font-semibold">{userCreditData.currentScore}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-500">Score History</p>
                            <p className="text-sm">{userCreditData.creditScores?.length || 0} records</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    No credit data available
                  </div>
                )}
              </ScrollArea>
              
              <div className="flex justify-end pt-4 border-t">
                <Button 
                  variant="outline" 
                  onClick={closeCreditDataModal}
                  disabled={loadingCreditData}
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LenderDashboard;

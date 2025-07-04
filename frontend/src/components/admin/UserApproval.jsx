import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, XCircle, Eye, Clock, User, Mail, Phone, 
  MapPin, Calendar, Building, DollarSign, AlertTriangle,
  FileText, Shield, Loader2, RefreshCw, Filter, Search
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { useToast } from '../../hooks/use-toast';
import { api } from '../../lib/api';

const UserApproval = () => {
  const { toast } = useToast();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [approving, setApproving] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [approvalData, setApprovalData] = useState({
    approved: true,
    role: 'user',
    adminNotes: ''
  });
  const [detailedUser, setDetailedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Fetch pending users
  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/users/pending');
      console.log('Pending users response:', response.data);
      console.log('Pending users data:', response.data.data);
      
      // Check if users have proper _id fields
      if (response.data.data && Array.isArray(response.data.data)) {
        response.data.data.forEach((user, index) => {
          console.log(`User ${index}:`, {
            _id: user._id,
            _idType: typeof user._id,
            name: user.name,
            email: user.email
          });
        });
      }
      
      setPendingUsers(response.data.data);
    } catch (error) {
      console.error('Error fetching pending users:', error);
      toast({
        title: 'Error',
        description: 'Failed to load pending users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  // Approve user
  const approveUser = async (userId, approved = true, role = 'user', adminNotes = '') => {
    try {
      setApproving(prev => ({ ...prev, [userId]: true }));
      
      const response = await api.post(`/admin/users/${userId}/approve`, {
        approved,
        role,
        adminNotes: adminNotes || (approved ? 'Approved by admin' : 'Rejected by admin')
      });

      if (approved && response.data && response.data.success) {
        toast({
          title: 'User Approved',
          description: 'User approved and email sent.',
          variant: 'success',
        });
      } else {
        toast({
          title: approved ? 'User Approved' : 'User Rejected',
          description: `User has been ${approved ? 'approved' : 'rejected'} as ${role}`,
          variant: approved ? 'default' : 'destructive',
        });
      }

      setPendingUsers(prev => prev.filter(user => user._id !== userId));
      
    } catch (error) {
      console.error('Error approving user:', error);
      toast({
        title: 'Error',
        description: 'Failed to process approval',
        variant: 'destructive',
      });
    } finally {
      setApproving(prev => ({ ...prev, [userId]: false }));
    }
  };

  // Filter users based on search
  const filteredUsers = pendingUsers.filter(user => 
    user.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleViewDetails = async (user) => {
    console.log('Opening user details for:', user._id, user.name);
    
    // Validate that user has a proper _id
    if (!user._id || typeof user._id !== 'string' || user._id === 'pending') {
      console.error('Invalid user ID:', user._id);
      toast({
        title: 'Error',
        description: 'Invalid user ID. Cannot load user details.',
        variant: 'destructive',
      });
      return;
    }
    
    setSelectedUser(user);
    setShowDetails(true);
    setDetailsLoading(true);
    try {
      console.log('Fetching user details from:', `/admin/users/${user._id}`);
      const response = await api.get(`/admin/users/${user._id}`);
      console.log('User details response:', response.data);
      setDetailedUser(response.data); // Backend returns data directly, not wrapped in data property
    } catch (err) {
      console.error('Error fetching user details:', err);
      toast({ title: 'Error', description: 'Failed to fetch user details', variant: 'destructive' });
      setDetailedUser(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            User Approval Queue
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve pending user registrations
          </p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={fetchPendingUsers}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-yellow-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <User className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Today</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.filter(user => {
                    const today = new Date().toDateString();
                    const userDate = new Date(user.createdAt).toDateString();
                    return today === userDate;
                  }).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-orange-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Unverified</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.filter(user => !user.emailVerified).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Shield className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Verified</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {pendingUsers.filter(user => user.emailVerified).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex space-x-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No pending users found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Financial Info</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user._id}>
                    <TableCell>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">{user.name || 'N/A'}</p>
                          <p className="text-sm text-gray-500">ID: {user.nationalId || 'N/A'}</p>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <Mail className="h-3 w-3 mr-1 text-gray-400" />
                          {user.email}
                        </div>
                        <div className="flex items-center text-sm">
                          <Phone className="h-3 w-3 mr-1 text-gray-400" />
                          {user.profile?.phone || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center text-sm">
                          <DollarSign className="h-3 w-3 mr-1 text-gray-400" />
                          Income: {user.monthlyIncome ? `$${user.monthlyIncome.toLocaleString()}` : 'N/A'}
                        </div>
                        <div className="flex items-center text-sm">
                          <Building className="h-3 w-3 mr-1 text-gray-400" />
                          {user.profile?.employmentStatus || 'N/A'}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                          <Clock className="h-3 w-3 mr-1" />Pending
                        </Badge>
                        {user.emailVerified ? (
                          <Badge variant="outline" className="text-green-600 border-green-600">
                            Email Verified
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-red-600 border-red-600">
                            Email Pending
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-sm text-gray-500">
                        {formatDate(user.createdAt)}
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleViewDetails(user)}
                          title="View details and set role"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => approveUser(user._id, true, 'user')}
                          disabled={approving[user._id]}
                          title="Approve as regular user"
                        >
                          {approving[user._id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => approveUser(user._id, true, 'lender')}
                          disabled={approving[user._id]}
                          className="border-blue-500 text-blue-500 hover:bg-blue-50"
                          title="Approve as lender"
                        >
                          {approving[user._id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Shield className="h-4 w-4" />
                          )}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => approveUser(user._id, false, 'user')}
                          disabled={approving[user._id]}
                          title="Reject user"
                        >
                          {approving[user._id] ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <XCircle className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* User Details Modal */}
      {showDetails && selectedUser && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDetails(false);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">User Details - {selectedUser.name}</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDetails(false)}
              >
                ×
              </Button>
            </div>
            {detailsLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mr-2" />
                <span>Loading user details...</span>
              </div>
            ) : detailedUser ? (
              <div className="space-y-4">
                {/* Personal Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Personal Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Full Name</label>
                        <p className="text-sm text-gray-600">{detailedUser.name || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">National ID</label>
                        <p className="text-sm text-gray-600">{detailedUser.nationalId || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <p className="text-sm text-gray-600">{detailedUser.email}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Phone</label>
                        <p className="text-sm text-gray-600">{detailedUser.profile?.phone || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Date of Birth</label>
                        <p className="text-sm text-gray-600">
                          {detailedUser.profile?.dateOfBirth ? 
                            new Date(detailedUser.profile.dateOfBirth).toLocaleDateString() : 'N/A'
                          }
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Gender</label>
                        <p className="text-sm text-gray-600">{detailedUser.profile?.gender || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <p className="text-sm text-gray-600">{detailedUser.profile?.fullAddress || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Financial Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Financial Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Monthly Income</label>
                        <p className="text-sm text-gray-600">
                          {detailedUser.monthlyIncome ? `$${detailedUser.monthlyIncome.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Monthly Savings</label>
                        <p className="text-sm text-gray-600">
                          {detailedUser.monthlySavings ? `$${detailedUser.monthlySavings.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Bank Balance</label>
                        <p className="text-sm text-gray-600">
                          {detailedUser.bankBalance ? `$${detailedUser.bankBalance.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Mobile Money</label>
                        <p className="text-sm text-gray-600">
                          {detailedUser.mobileMoneyBalance ? `$${detailedUser.mobileMoneyBalance.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Current Loans</label>
                        <p className="text-sm text-gray-600">
                          {detailedUser.totalDebt ? `$${detailedUser.totalDebt.toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Employment</label>
                        <p className="text-sm text-gray-600">{detailedUser.profile?.employmentStatus || 'N/A'}</p>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Employer</label>
                      <p className="text-sm text-gray-600">{detailedUser.profile?.employerName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Industry</label>
                      <p className="text-sm text-gray-600">{detailedUser.profile?.industry || 'N/A'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Account Status */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Account Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Status</label>
                        <div className="mt-1">{getStatusBadge(detailedUser.status)}</div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email Verified</label>
                        <div className="mt-1">
                          {detailedUser.emailVerified ? (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-red-600 border-red-600">
                              Pending
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Registered</label>
                        <p className="text-sm text-gray-600">{formatDate(detailedUser.createdAt)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium">Last Updated</label>
                        <p className="text-sm text-gray-600">{formatDate(detailedUser.updatedAt)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Credit Score & Report */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Credit Score & Report</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <label className="text-sm font-medium">Credit Score</label>
                      <p className="text-sm text-gray-600">{detailedUser.creditScore?.score || detailedUser.creditScore?.fico?.score || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Credit Report</label>
                      <pre className="bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs overflow-x-auto max-h-40">
                        {detailedUser.creditReport ? JSON.stringify(detailedUser.creditReport, null, 2) : 'N/A'}
                      </pre>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500">No user details found</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end space-x-2 mt-6">
              <Button
                variant="outline"
                onClick={() => setShowDetails(false)}
              >
                Close
              </Button>
              
              {/* Role Selection */}
              <div className="flex items-center space-x-4 mr-4">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="role" className="text-sm font-medium">Role:</Label>
                  <Select
                    value={approvalData.role}
                    onValueChange={(value) => setApprovalData(prev => ({ ...prev, role: value }))}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">User</SelectItem>
                      <SelectItem value="lender">Lender</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Admin Notes */}
              <div className="flex-1 mr-4">
                <Textarea
                  placeholder="Admin notes (optional)..."
                  value={approvalData.adminNotes}
                  onChange={(e) => setApprovalData(prev => ({ ...prev, adminNotes: e.target.value }))}
                  className="min-h-[60px]"
                />
              </div>
              
              <Button
                variant="destructive"
                onClick={() => {
                  approveUser(selectedUser._id, false, approvalData.role, approvalData.adminNotes);
                  setShowDetails(false);
                }}
                disabled={approving[selectedUser._id]}
              >
                {approving[selectedUser._id] ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                Reject
              </Button>
              <Button
                onClick={() => {
                  approveUser(selectedUser._id, true, approvalData.role, approvalData.adminNotes);
                  setShowDetails(false);
                }}
                disabled={approving[selectedUser._id]}
              >
                {approving[selectedUser._id] ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-2" />
                )}
                Approve as {approvalData.role}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserApproval; 
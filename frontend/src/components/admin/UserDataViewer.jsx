import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Loader2, User, CreditCard } from 'lucide-react';

// UI Components
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from "../../contexts/AuthContext";
import { api } from "../../lib/api";

// Status badge colors
const statusColors = {
  active: 'bg-green-100 text-green-800',
  inactive: 'bg-gray-100 text-gray-800',
  pending: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-red-100 text-red-800',
};

const UserDataViewer = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useAuth();
  
  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const searchTimeoutRef = useRef(null);

  // Search users with debounce
  const searchUsers = useCallback(async (query = '') => {
    if (!query.trim()) {
      setUsers([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await api.get(`/admin/users?search=${encodeURIComponent(query)}`);
      setUsers(Array.isArray(response.data.data) ? response.data.data : []);
      
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

  // Clear search
  const clearSearch = () => {
    setSearchQuery('');
    setUsers([]);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

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
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user._id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
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
                      {user.updatedAt ? new Date(user.updatedAt).toLocaleDateString() : 'N/A'}
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
    </div>
  );
};

export default UserDataViewer;

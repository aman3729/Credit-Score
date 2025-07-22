import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { UserPlus, Upload, Clock, Filter, Search, User, MoreHorizontal, Eye, Edit, Key, XCircle, CheckCircle2, Trash2 } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator
} from "../ui/dropdown-menu";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';
import { format } from 'date-fns';
import { Skeleton } from '../ui/skeleton';
import { Pagination, PaginationContent, PaginationItem, PaginationPrevious, PaginationLink, PaginationNext } from '../ui/pagination';

const UserManagementPanel = ({
  users,
  searchQuery,
  setSearchQuery,
  searchTimeout,
  setSearchTimeout,
  fetchUsers,
  navigate,
  setShowRegisterUser,
  setShowBatchUpload,
  setActiveTab,
  handleUserAction,
  loading,
  error,
  onRefresh,
  currentPage,
  totalPages,
  handlePageChange
}) => (
  <Card className="border border-gray-200 dark:border-[#1a4a38] rounded-xl shadow-sm overflow-hidden">
    <CardHeader className="bg-gradient-to-r from-[#f0f7f4] to-[#e4f1eb] dark:from-[#0d261c] dark:to-[#1a4a38] p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <CardTitle className="text-2xl font-bold text-gray-900 dark:text-[#e0f2e9]">User Management</CardTitle>
          <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
            Manage system users and their permissions
          </CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowRegisterUser(true)}
            className="bg-gradient-to-r from-[#4caf50] to-[#8bc34a] hover:from-[#3d8b40] hover:to-[#7cb342] text-white shadow-md"
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setShowBatchUpload(true)}
            className="border-[#4caf50] text-[#2e7d32] hover:bg-[#f0f7f4] dark:border-[#8bc34a] dark:text-[#a8d5ba] dark:hover:bg-[#1a4a38]"
          >
            <Upload className="mr-2 h-4 w-4" />
            Batch Upload
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('user-approval')}
            className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900/30"
          >
            <Clock className="mr-2 h-4 w-4" />
            Pending Approvals
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="border-[#4caf50] text-[#2e7d32] dark:border-[#8bc34a] dark:text-[#a8d5ba]">
                <Filter className="mr-2 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[180px] rounded-lg shadow-xl border border-gray-200 dark:border-[#1a4a38]">
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">Active Users</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">Suspended Users</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">Unverified Users</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">Admins Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={onRefresh}
            className="border-[#4caf50] text-[#2e7d32] hover:bg-[#f0f7f4] dark:border-[#8bc34a] dark:text-[#a8d5ba] dark:hover:bg-[#1a4a38]"
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>
    </CardHeader>
    
    <CardContent className="p-6">
      <div className="mb-6">
        <div className="relative w-full max-w-xl">
          <label htmlFor="user-search" className="sr-only">Search users</label>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            id="user-search"
            type="text"
            placeholder="Search by name, email, or role..."
            className="pl-10 w-full rounded-xl border-gray-300 focus:border-[#4caf50] focus:ring-1 focus:ring-[#8bc34a] dark:border-[#2e4d3d] dark:focus:ring-[#4caf50]"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              clearTimeout(searchTimeout);
              setSearchTimeout(setTimeout(() => {
                fetchUsers(1, e.target.value);
              }, 500));
            }}
            aria-label="Search users by name, email, or role"
          />
        </div>
      </div>
      
      {loading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#1a4a38] rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-center border border-red-200 dark:border-red-900/30">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-red-600 dark:text-red-300 font-medium">Error:</span>
              <span className="text-red-700 dark:text-red-300">{error}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 dark:border-[#1a4a38] overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-[#f0f7f4] dark:bg-[#0d261c]">
              <TableRow>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba] py-4">User</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba]">Role</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba]">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba]">Credit Score</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba]">Registration Date</TableHead>
                <TableHead className="font-semibold text-right text-gray-700 dark:text-[#a8d5ba]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user._id} className="border-b border-gray-100 dark:border-[#1a4a38] hover:bg-[#f9fdfb] dark:hover:bg-[#152e24]">
                  <TableCell className="py-4">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-br from-[#8bc34a] to-[#4caf50] text-white h-10 w-10 rounded-full flex items-center justify-center mr-3 shadow-sm">
                        <User className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                        <div className="text-sm text-gray-600 dark:text-[#a8d5ba]">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        (user.role === 'admin') 
                          ? 'bg-[#0d261c] text-[#8bc34a]' 
                          : (user.role === 'lender')
                          ? 'bg-[#ffd54f]/20 text-amber-700 dark:text-amber-300'
                          : 'bg-[#e0efe9] text-[#2e7d32] dark:bg-[#1a4a38]'
                      }`}
                    >
                      {user.role === 'admin' ? 'Admin' : user.role === 'lender' ? 'Lender' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.emailVerified ? (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-medium">
                        Verified
                      </Badge>
                    ) : user.active ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-3 py-1 rounded-full text-xs font-medium">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 px-3 py-1 rounded-full text-xs font-medium">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.creditScore ? (
                      <div className="flex items-center">
                        <span className="font-semibold mr-2 text-gray-900 dark:text-white">{user.creditScore.score}</span>
                        <Badge 
                          className={`px-2 py-0.5 rounded-full text-xs ${
                            user.creditScore.score >= 800 
                              ? 'bg-[#4caf50]/20 text-green-800 dark:text-green-300' 
                              : user.creditScore.score >= 700 
                              ? 'bg-[#8bc34a]/20 text-lime-800 dark:text-lime-300'
                              : user.creditScore.score >= 600
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                          }`}
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
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a4a38]" aria-label="Open user actions menu">
                          <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-[#a8d5ba]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-[180px] rounded-xl shadow-xl p-1 animate-fade-in bg-white dark:bg-[#0d261c] border border-gray-200 dark:border-[#2e4d3d]">
                        <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" onClick={() => navigate(`/admin/users/${user._id}`)} aria-label="View user details">
                          <Eye className="h-4 w-4 text-blue-500" aria-hidden="true" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" onClick={() => navigate(`/admin/users/${user._id}/edit`)} aria-label="Edit user profile">
                          <Edit className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'impersonate')} aria-label="Impersonate user">
                          <User className="h-4 w-4 text-purple-500" aria-hidden="true" />
                          Impersonate
                        </DropdownMenuItem>
                        <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'reset-password')} aria-label="Reset user password">
                          <Key className="h-4 w-4 text-amber-500" aria-hidden="true" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-[#2e4d3d]" />
                        {user.active ? (
                          <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'suspend')} aria-label="Suspend user">
                            <XCircle className="h-4 w-4 text-yellow-600" aria-hidden="true" />
                            Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'activate')} aria-label="Activate user">
                            <CheckCircle2 className="h-4 w-4 text-green-600" aria-hidden="true" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {!user.emailVerified && (
                          <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" onClick={() => handleUserAction(user._id, 'verify')} aria-label="Verify user">
                            <CheckCircle2 className="h-4 w-4 text-blue-600" aria-hidden="true" />
                            Verify
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem className="px-4 py-2.5 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2 text-red-600" onClick={() => handleUserAction(user._id, 'delete')} aria-label="Delete user">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </CardContent>
    
    {!loading && !error && totalPages > 1 && (
      <CardFooter className="bg-[#f9fdfb] dark:bg-[#0d261c] border-t border-gray-200 dark:border-[#1a4a38] p-4">
        <Pagination className="w-full">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className={currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              />
            </PaginationItem>
            
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => handlePageChange(page)}
                  className={`cursor-pointer ${page === currentPage ? 'bg-[#4caf50] text-white' : ''}`}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className={currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardFooter>
    )}
  </Card>
);

export default UserManagementPanel;
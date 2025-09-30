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
    <CardHeader className="bg-gradient-to-r from-[#f0f7f4] to-[#e4f1eb] dark:from-[#0d261c] dark:to-[#1a4a38] p-4 sm:p-6">
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <CardTitle className="text-xl font-bold text-gray-900 dark:text-[#e0f2e9]">User Management</CardTitle>
          <CardDescription className="text-sm text-gray-600 dark:text-[#a8d5ba]">
            Manage system users and their permissions
          </CardDescription>
        </div>
        
        {/* Mobile-friendly search bar */}
        <div className="relative w-full">
          <label htmlFor="mobile-user-search" className="sr-only">Search users</label>
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <Input
            id="mobile-user-search"
            type="text"
            placeholder="Search users..."
            className="pl-10 w-full rounded-xl border-gray-300 focus:border-[#4caf50] text-sm"
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
        
        <div className="flex flex-wrap gap-2">
          <Button 
            onClick={() => setShowRegisterUser(true)}
            className="bg-gradient-to-r from-[#4caf50] to-[#8bc34a] hover:from-[#3d8b40] hover:to-[#7cb342] text-white shadow text-sm"
            size="sm"
            aria-label="Add new user"
          >
            <UserPlus className="mr-1 h-4 w-4" />
            <span className="hidden xs:inline">Add User</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('batch-uploads')}
            className="border-[#ff9800] text-[#e68a00] hover:bg-[#fff3e0] dark:border-[#ffb74d] dark:text-[#ffcc02] dark:hover:bg-[#ff9800]/20 text-sm"
            size="sm"
            aria-label="Go to batch uploads"
          >
            <Upload className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Batch Upload</span>
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('user-approval')}
            className="border-amber-500 text-amber-600 hover:bg-amber-50 dark:border-amber-400 dark:text-amber-300 dark:hover:bg-amber-900/30 text-sm"
            size="sm"
            aria-label="View pending approvals"
          >
            <Clock className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Pending</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                className="border-[#4caf50] text-[#2e7d32] dark:border-[#8bc34a] dark:text-[#a8d5ba] text-sm"
                size="sm"
                aria-label="Filter users"
              >
                <Filter className="mr-1 h-4 w-4" />
                Filter
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="min-w-[160px] rounded-lg shadow-xl border border-gray-200 dark:border-[#1a4a38] bg-white dark:bg-[#0d261c]">
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] text-sm py-2">Active Users</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] text-sm py-2">Suspended Users</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] text-sm py-2">Unverified Users</DropdownMenuItem>
              <DropdownMenuItem className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] text-sm py-2">Admins Only</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            variant="outline"
            onClick={onRefresh}
            className="border-[#4caf50] text-[#2e7d32] hover:bg-[#f0f7f4] dark:border-[#8bc34a] dark:text-[#a8d5ba] dark:hover:bg-[#1a4a38] text-sm"
            size="sm"
            disabled={loading}
            aria-label="Refresh user list"
          >
            Refresh
          </Button>
        </div>
      </div>
    </CardHeader>
    
    <CardContent className="p-4 sm:p-6">
      {/* Mobile User List */}
      {!loading && !error && (
        <div className="block md:hidden space-y-3 w-full overflow-x-auto">
          {users.map((user) => (
            <div 
              key={user._id} 
              className="bg-white dark:bg-[#0d261c] rounded-xl shadow border border-gray-200 dark:border-[#1a4a38] p-3 flex flex-col gap-2 w-full"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-br from-[#8bc34a] to-[#4caf50] text-white h-8 w-8 rounded-full flex items-center justify-center shadow-sm">
                    <User className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white text-sm">{user.name || 'N/A'}</div>
                    <div className="text-xs text-gray-600 dark:text-[#a8d5ba] max-w-full break-all">{user.email}</div>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a4a38]" 
                      aria-label="Open user actions menu"
                    >
                      <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-[#a8d5ba]" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="min-w-[160px] rounded-xl shadow-xl p-1 bg-white dark:bg-[#0d261c] border border-gray-200 dark:border-[#2e4d3d]">
                    <DropdownMenuItem 
                      className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                      onClick={() => navigate(`/admin/users/${user._id}`)}
                      aria-label="View user details"
                    >
                      <Eye className="h-4 w-4 text-blue-500" /> View
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                      onClick={() => navigate(`/admin/users/${user._id}/edit`)}
                      aria-label="Edit user profile"
                    >
                      <Edit className="h-4 w-4 text-indigo-500" /> Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                      onClick={() => handleUserAction(user._id, 'impersonate')}
                      aria-label="Impersonate user"
                    >
                      <User className="h-4 w-4 text-purple-500" /> Impersonate
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                      onClick={() => handleUserAction(user._id, 'reset-password')}
                      aria-label="Reset user password"
                    >
                      <Key className="h-4 w-4 text-amber-500" /> Reset Password
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-[#2e4d3d]" />
                    {user.active ? (
                      <DropdownMenuItem 
                        className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                        onClick={() => handleUserAction(user._id, 'suspend')}
                        aria-label="Suspend user"
                      >
                        <XCircle className="h-4 w-4 text-yellow-600" /> Suspend
                      </DropdownMenuItem>
                    ) : (
                      <DropdownMenuItem 
                        className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                        onClick={() => handleUserAction(user._id, 'activate')}
                        aria-label="Activate user"
                      >
                        <CheckCircle2 className="h-4 w-4 text-green-600" /> Activate
                      </DropdownMenuItem>
                    )}
                    {!user.emailVerified && (
                      <DropdownMenuItem 
                        className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                        onClick={() => handleUserAction(user._id, 'verify')}
                        aria-label="Verify user"
                      >
                        <CheckCircle2 className="h-4 w-4 text-blue-600" /> Verify
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem 
                      className="px-3 py-2 text-sm flex items-center gap-2 text-red-600 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]" 
                      onClick={() => handleUserAction(user._id, 'delete')}
                      aria-label="Delete user"
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <div className="flex flex-wrap gap-2 items-center text-xs mt-1">
                <Badge 
                  className={`px-2 py-0.5 rounded-full ${
                    user.role === 'admin' 
                      ? 'bg-[#0d261c] text-[#8bc34a]' 
                      : user.role === 'lender' 
                      ? 'bg-[#ffd54f]/20 text-amber-700 dark:text-amber-300' 
                      : 'bg-[#e0efe9] text-[#2e7d32] dark:bg-[#1a4a38]'
                  }`}
                >
                  {user.role === 'admin' ? 'Admin' : user.role === 'lender' ? 'Lender' : 'User'}
                </Badge>
                {user.emailVerified ? (
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">Verified</Badge>
                ) : user.active ? (
                  <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">Active</Badge>
                ) : (
                  <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">Inactive</Badge>
                )}
                {user.creditScore ? (
                  <span className="font-semibold text-gray-900 dark:text-white">{user.creditScore.score}</span>
                ) : (
                  <span className="text-gray-400">No score</span>
                )}
                <span className="ml-auto text-gray-500 dark:text-[#a8d5ba] text-xs">
                  {user.createdAt ? format(new Date(user.createdAt), 'MMM d') : 'N/A'}
                </span>
              </div>
          </div>
          ))}
        </div>
      )}
      
      {/* Desktop Table - Hidden on mobile */}
      {loading ? (
        <div className="hidden md:block space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 border border-gray-200 dark:border-[#1a4a38] rounded-lg">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-10 w-10 rounded-full" />
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
              <span className="text-red-700 dark:text-red-300 text-sm">{error}</span>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            className="text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30"
            aria-label="Retry loading users"
          >
            Retry
          </Button>
        </div>
      ) : (
        <div className="hidden md:block rounded-lg border border-gray-200 dark:border-[#1a4a38] overflow-hidden">
          <Table className="min-w-full">
            <TableHeader className="bg-[#f0f7f4] dark:bg-[#0d261c]">
              <TableRow>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba] py-3 text-sm">User</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba] py-3 text-sm">Role</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba] py-3 text-sm">Status</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba] py-3 text-sm">Credit Score</TableHead>
                <TableHead className="font-semibold text-gray-700 dark:text-[#a8d5ba] py-3 text-sm">Registration</TableHead>
                <TableHead className="font-semibold text-right text-gray-700 dark:text-[#a8d5ba] py-3 text-sm">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow 
                  key={user._id} 
                  className="border-b border-gray-100 dark:border-[#1a4a38] hover:bg-[#f9fdfb] dark:hover:bg-[#152e24]"
                >
                  <TableCell className="py-3">
                    <div className="flex items-center">
                      <div className="bg-gradient-to-br from-[#8bc34a] to-[#4caf50] text-white h-8 w-8 rounded-full flex items-center justify-center mr-3 shadow-sm">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white text-sm">{user.name || 'N/A'}</div>
                        <div className="text-xs text-gray-600 dark:text-[#a8d5ba] truncate max-w-[200px]">{user.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        user.role === 'admin' 
                          ? 'bg-[#0d261c] text-[#8bc34a]' 
                          : user.role === 'lender'
                          ? 'bg-[#ffd54f]/20 text-amber-700 dark:text-amber-300'
                          : 'bg-[#e0efe9] text-[#2e7d32] dark:bg-[#1a4a38]'
                      }`}
                    >
                      {user.role === 'admin' ? 'Admin' : user.role === 'lender' ? 'Lender' : 'User'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.emailVerified ? (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-medium">
                        Verified
                      </Badge>
                    ) : user.active ? (
                      <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-0.5 rounded-full text-xs font-medium">
                        Active
                      </Badge>
                    ) : (
                      <Badge className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-medium">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {user.creditScore ? (
                      <div className="flex items-center">
                        <span className="font-semibold mr-2 text-gray-900 dark:text-white text-sm">{user.creditScore.score}</span>
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
                  <TableCell className="text-gray-600 dark:text-[#a8d5ba] text-sm">
                    {user.createdAt ? format(new Date(user.createdAt), 'MMM d, yyyy') : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a4a38]" 
                          aria-label="Open user actions menu"
                        >
                          <MoreHorizontal className="h-4 w-4 text-gray-600 dark:text-[#a8d5ba]" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="min-w-[180px] rounded-xl shadow-xl p-1 bg-white dark:bg-[#0d261c] border border-gray-200 dark:border-[#2e4d3d]">
                        <DropdownMenuItem 
                          className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" 
                          onClick={() => navigate(`/admin/users/${user._id}`)}
                          aria-label="View user details"
                        >
                          <Eye className="h-4 w-4 text-blue-500" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" 
                          onClick={() => navigate(`/admin/users/${user._id}/edit`)}
                          aria-label="Edit user profile"
                        >
                          <Edit className="h-4 w-4 text-indigo-500" />
                          Edit Profile
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" 
                          onClick={() => handleUserAction(user._id, 'impersonate')}
                          aria-label="Impersonate user"
                        >
                          <User className="h-4 w-4 text-purple-500" />
                          Impersonate
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" 
                          onClick={() => handleUserAction(user._id, 'reset-password')}
                          aria-label="Reset user password"
                        >
                          <Key className="h-4 w-4 text-amber-500" />
                          Reset Password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator className="my-1 bg-gray-200 dark:bg-[#2e4d3d]" />
                        {user.active ? (
                          <DropdownMenuItem 
                            className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" 
                            onClick={() => handleUserAction(user._id, 'suspend')}
                            aria-label="Suspend user"
                          >
                            <XCircle className="h-4 w-4 text-yellow-600" />
                            Suspend
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" 
                            onClick={() => handleUserAction(user._id, 'activate')}
                            aria-label="Activate user"
                          >
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            Activate
                          </DropdownMenuItem>
                        )}
                        {!user.emailVerified && (
                          <DropdownMenuItem 
                            className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2" 
                            onClick={() => handleUserAction(user._id, 'verify')}
                            aria-label="Verify user"
                          >
                            <CheckCircle2 className="h-4 w-4 text-blue-600" />
                            Verify
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          className="px-3 py-2 text-sm hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38] flex items-center gap-2 text-red-600" 
                          onClick={() => handleUserAction(user._id, 'delete')}
                          aria-label="Delete user"
                        >
                          <Trash2 className="h-4 w-4" />
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
          <PaginationContent className="flex flex-wrap justify-center gap-1">
            <PaginationItem>
              <PaginationPrevious 
                onClick={() => currentPage > 1 && handlePageChange(currentPage - 1)} 
                disabled={currentPage === 1}
                className={`text-sm ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label="Previous page"
              />
            </PaginationItem>
            
            {Array.from({ length: Math.min(totalPages, 3) }, (_, i) => {
              const page = currentPage <= 2 ? i + 1 : currentPage - 1 + i;
              return page <= totalPages ? (
              <PaginationItem key={page}>
                <PaginationLink
                  isActive={page === currentPage}
                  onClick={() => handlePageChange(page)}
                    className={`text-sm min-w-[36px] ${page === currentPage ? 'bg-[#4caf50] text-white' : ''}`}
                    aria-label={`Go to page ${page}`}
                  >
                    {page}
                  </PaginationLink>
                </PaginationItem>
              ) : null;
            })}
            
            {totalPages > 3 && currentPage < totalPages - 1 && (
              <PaginationItem>
                <span className="px-2 py-1 text-gray-500">...</span>
              </PaginationItem>
            )}
            
            {totalPages > 3 && currentPage < totalPages && (
              <PaginationItem>
                <PaginationLink
                  isActive={totalPages === currentPage}
                  onClick={() => handlePageChange(totalPages)}
                  className={`text-sm min-w-[36px] ${totalPages === currentPage ? 'bg-[#4caf50] text-white' : ''}`}
                  aria-label={`Go to page ${totalPages}`}
                >
                  {totalPages}
                </PaginationLink>
              </PaginationItem>
            )}
            
            <PaginationItem>
              <PaginationNext 
                onClick={() => currentPage < totalPages && handlePageChange(currentPage + 1)} 
                disabled={currentPage === totalPages}
                className={`text-sm ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                aria-label="Next page"
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </CardFooter>
    )}
  </Card>
);

export default UserManagementPanel;
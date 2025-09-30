import React from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { RefreshCw, Flag, Badge, Filter, Search, Eye, Upload } from 'lucide-react';
import { Input } from '../ui/input';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem
} from "../ui/dropdown-menu";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '../ui/table';

const CreditOversightPanel = ({
  loading,
  error,
  scoreFilter,
  setScoreFilter,
  searchQuery,
  setSearchQuery,
  searchTimeout,
  setSearchTimeout,
  fetchCreditReports,
  applyFilter,
  creditReports,
  toast,
  api,
  onRefresh,
  setActiveTab
}) => (
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
              }
            }}
            disabled={loading}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Recalculate Scores
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setActiveTab('batch-uploads')}
            className="border-[#ff9800] text-[#e68a00] hover:bg-[#fff3e0] dark:border-[#ffb74d] dark:text-[#ffcc02] dark:hover:bg-[#ff9800]/20"
          >
            <Upload className="mr-2 h-4 w-4" />
            Batch Upload
          </Button>
          <Button 
            variant="outline" 
            className="border-[#2196f3] text-[#2196f3] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
            onClick={async () => {
              try {
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
              }
            }}
            disabled={loading}
          >
            <Flag className="mr-2 h-4 w-4" />
            Flag Suspicious
          </Button>
          <Button
            variant="outline"
            onClick={onRefresh}
            className="border-[#2196f3] text-[#2196f3] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
            disabled={loading}
          >
            Refresh
          </Button>
        </div>
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[200px]">
          <div className="animate-spin h-12 w-12 border-t-4 border-b-4 border-[#2196f3] rounded-full mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading credit reports...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg mb-4">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-bold">Error:</span>
            <span className="text-red-700 dark:text-red-300">{error}</span>
          </div>
        </div>
      ) : (
        <>
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
            {/* Mobile Card List */}
            <div className="block md:hidden space-y-3 w-full overflow-x-auto">
              {creditReports.map((report) => {
                // Score badge logic
                let scoreLabel = 'Poor', scoreColor = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
                if (report.score >= 800) {
                  scoreLabel = 'Excellent'; scoreColor = 'bg-[#4caf50]/20 text-green-800 dark:text-green-300';
                } else if (report.score >= 700) {
                  scoreLabel = 'Good'; scoreColor = 'bg-[#8bc34a]/20 text-lime-800 dark:text-lime-300';
                } else if (report.score >= 600) {
                  scoreLabel = 'Fair'; scoreColor = 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300';
                }
                return (
                  <div
                    key={report.id}
                    className="bg-white dark:bg-[#0d261c] rounded-xl shadow border border-[#1a4a38] p-3 flex flex-col gap-2 w-full"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="bg-gradient-to-br from-[#8bc34a] to-[#2196f3] text-white h-8 w-8 rounded-full flex items-center justify-center shadow-sm">
                          <span className="font-bold text-lg">{report.userName?.[0] || '?'}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white text-sm">{report.userName}</div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${scoreColor}`}>{scoreLabel}</span>
                            <span className="font-semibold text-gray-900 dark:text-white text-xs">{report.score}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100 dark:hover:bg-[#1a4a38]"
                            aria-label="Open credit report actions menu"
                          >
                            <Eye className="h-4 w-4 text-blue-500" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="min-w-[140px] rounded-xl shadow-xl p-1 bg-white dark:bg-[#0d261c] border border-gray-200 dark:border-[#2e4d3d]">
                          <DropdownMenuItem className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                            <Eye className="h-4 w-4 text-blue-500" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                            <Flag className="h-4 w-4 text-yellow-600" /> Flag Suspicious
                          </DropdownMenuItem>
                          <DropdownMenuItem className="px-3 py-2 text-sm flex items-center gap-2 hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                            <RefreshCw className="h-4 w-4 text-green-600" /> Recalculate
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center text-xs mt-1">
                      <span className="bg-[#e3f2fd] text-[#1976d2] px-2 py-0.5 rounded-full">{report.status}</span>
                      {report.factors && (
                        <span className="bg-[#f0f7f4] text-gray-700 px-2 py-0.5 rounded-full">{report.factors}</span>
                      )}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 dark:text-[#a8d5ba] mt-1">
                      Last updated: {report.lastUpdated}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Desktop Table - Hidden on mobile */}
            <div className="hidden md:block w-full overflow-x-auto">
              <div className="min-w-[700px]">
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
                    {creditReports.map((report) => (
                      <TableRow key={report.id} className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                        <TableCell className="font-medium">{report.userName}</TableCell>
                        <TableCell>{report.score}</TableCell>
                        <TableCell>{report.factors}</TableCell>
                        <TableCell>{report.status}</TableCell>
                        <TableCell>{report.lastUpdated}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

export default CreditOversightPanel; 
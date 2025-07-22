import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Download, Clock, CheckCircle, XCircle, AlertCircle, FileText, Filter } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { DateRangePicker } from '../ui/date-range-picker';
import { useToast } from '../../hooks/use-toast';
import api from '../../lib/api';

const statusVariant = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const statusIcons = {
  pending: <Clock className="h-4 w-4" />,
  processing: <Clock className="h-4 w-4 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4" />,
  failed: <XCircle className="h-4 w-4" />,
};

export function UploadHistory() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    startDate: null,
    endDate: null,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  const [showFilters, setShowFilters] = useState(false);
  const { toast } = useToast();

  const fetchUploadHistory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination?.page || 1,
        limit: pagination?.limit || 10,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
        ...(filters.startDate && { startDate: filters.startDate.toISOString() }),
        ...(filters.endDate && { endDate: filters.endDate.toISOString() }),
        sortBy: filters.sortBy || 'createdAt',
        sortOrder: filters.sortOrder || 'desc',
      });

      console.log('Fetching upload history with params:', Object.fromEntries(params.entries()));
      const response = await api.get(`/upload-history?${params}`);
      
      console.log('Upload history response:', response.data);
      
      // Ensure we have valid data before updating state
      if (response.data && response.data.data) {
        setHistory(response.data.data);
        
        // Safely update pagination with defaults if needed
        setPagination(prev => ({
          page: response.data.pagination?.page || prev.page || 1,
          limit: response.data.pagination?.limit || prev.limit || 10,
          total: response.data.pagination?.total || 0,
          pages: response.data.pagination?.pages || 1,
        }));
      }
    } catch (error) {
      console.error('Error fetching upload history:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to fetch upload history. Please try again.',
        variant: 'destructive',
      });
      
      // Set empty state on error
      setHistory([]);
      setPagination({
        page: 1,
        limit: 10,
        total: 0,
        pages: 1,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUploadHistory();
  }, [pagination.page, pagination.limit, filters]);

  const handlePageChange = (newPage) => {
    setPagination(prev => ({
      ...prev,
      page: newPage,
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
    // Reset to first page when filters change
    setPagination(prev => ({
      ...prev,
      page: 1,
    }));
  };

  const handleDateRangeChange = (range) => {
    setFilters(prev => ({
      ...prev,
      startDate: range?.from || null,
      endDate: range?.to || null,
    }));
  };

  const handleDownloadReport = async (uploadId) => {
    try {
      const response = await api.get(`/upload/history/${uploadId}/report`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `upload-report-${uploadId}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Error downloading report:', error);
      toast({
        title: 'Error',
        description: 'Failed to download report. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Upload History</h2>
          <p className="text-muted-foreground">
            View and manage your file upload history
          </p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>

      {showFilters && (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select 
                  value={filters.status} 
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <DateRangePicker
                  onUpdate={({ range }) => handleDateRangeChange(range)}
                  initialDateFrom={filters.startDate}
                  initialDateTo={filters.endDate}
                  align="start"
                  placeholder="Select date range"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sort By</label>
                <Select 
                  value={filters.sortBy} 
                  onValueChange={(value) => handleFilterChange('sortBy', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">Upload Date</SelectItem>
                    <SelectItem value="filename">Filename</SelectItem>
                    <SelectItem value="status">Status</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <Input 
                  placeholder="Search by filename or user..." 
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Uploads</CardTitle>
              <CardDescription>
                Showing {history.length} of {pagination?.total || 0} uploads
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" className="h-8">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Filename</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded By</TableHead>
                <TableHead>Records</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : history.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No uploads found
                  </TableCell>
                </TableRow>
              ) : (
                history.map((item) => (
                  <TableRow key={item._id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="truncate max-w-[200px]">
                          {item.filename}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={`inline-flex items-center gap-1 ${statusVariant[item.status] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {statusIcons[item.status] || <AlertCircle className="h-3 w-3" />}
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {item.uploadedBy?.username || 'System'}
                    </TableCell>
                    <TableCell>
                      {item.recordCount} records
                      {item.processedCount !== undefined && (
                        <span className="text-muted-foreground text-xs ml-1">
                          ({item.processedCount} processed)
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{format(new Date(item.createdAt), 'MMM d, yyyy')}</span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(item.createdAt), 'h:mm a')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-8 px-2"
                          onClick={() => handleDownloadReport(item._id)}
                          disabled={item.status !== 'completed'}
                        >
                          <Download className="h-4 w-4" />
                          <span className="sr-only">Download</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          
          {pagination?.pages > 1 && (
            <div className="flex items-center justify-end space-x-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(pagination?.page - 1)}
                disabled={pagination?.page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {pagination?.page || 1} of {pagination?.pages || 1}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange((pagination?.page || 0) + 1)}
                disabled={(pagination?.page || 0) >= (pagination?.pages || 1)}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default UploadHistory;

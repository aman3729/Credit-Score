import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Progress } from '../ui/progress';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database, 
  HardDrive, 
  Network, 
  RefreshCw, 
  Server, 
  Shield, 
  Users, 
  Zap,
  AlertCircle,
  Info,
  XCircle
} from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../hooks/use-toast';

const SystemMonitor = () => {
  const [systemHealth, setSystemHealth] = useState({});
  const [errorLogs, setErrorLogs] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({});
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Fetch system health data
  const fetchSystemHealth = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get('/admin/system/health');
      setSystemHealth(response.data);
    } catch (error) {
      console.error('Error fetching system health:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch system health data',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Fetch error logs
  const fetchErrorLogs = useCallback(async () => {
    try {
      const response = await api.get('/admin/system/logs');
      setErrorLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error fetching error logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch error logs',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Fetch system metrics
  const fetchSystemMetrics = useCallback(async () => {
    try {
      const response = await api.get('/admin/system/metrics');
      setSystemMetrics(response.data);
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch system metrics',
        variant: 'destructive',
      });
    }
  }, [toast]);

  // Refresh all data
  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchSystemHealth(),
      fetchErrorLogs(),
      fetchSystemMetrics()
    ]);
  }, [fetchSystemHealth, fetchErrorLogs, fetchSystemMetrics]);

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      refreshAll();
      const interval = setInterval(refreshAll, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshAll]);

  // Initial load
  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Restart service
  const restartService = async (serviceName) => {
    try {
      await api.post(`/admin/system/restart/${serviceName}`);
      toast({
        title: 'Success',
        description: `${serviceName} service restarted successfully`,
        variant: 'default',
      });
      setTimeout(refreshAll, 2000); // Refresh after restart
    } catch (error) {
      console.error(`Error restarting ${serviceName}:`, error);
      toast({
        title: 'Error',
        description: `Failed to restart ${serviceName} service`,
        variant: 'destructive',
      });
    }
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'online':
      case 'running':
        return 'bg-green-100 text-green-800';
      case 'warning':
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800';
      case 'error':
      case 'offline':
      case 'stopped':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'healthy':
      case 'online':
      case 'running':
        return <CheckCircle className="h-4 w-4" />;
      case 'warning':
      case 'degraded':
        return <AlertTriangle className="h-4 w-4" />;
      case 'error':
      case 'offline':
      case 'stopped':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Monitor</h2>
          <p className="text-gray-600 dark:text-gray-400">Monitor system health, view error logs, and restart subsystems.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={refreshAll}
            disabled={loading}
            className="border-[#8bc34a] text-[#8bc34a] hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant={autoRefresh ? "default" : "outline"}
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-[#8bc34a] hover:bg-[#7cb342]" : "border-[#8bc34a] text-[#8bc34a]"}
          >
            <Clock className="h-4 w-4 mr-2" />
            Auto Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border border-[#1a4a38]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Server className="h-4 w-4 mr-2" />
              Server Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(systemHealth.server?.status)}>
                {getStatusIcon(systemHealth.server?.status)}
                <span className="ml-1">{systemHealth.server?.status || 'Unknown'}</span>
              </Badge>
              <Button
                size="sm"
                variant="outline"
                onClick={() => restartService('server')}
                className="h-6 px-2 text-xs"
              >
                Restart
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#1a4a38]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Database className="h-4 w-4 mr-2" />
              Database
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(systemHealth.database?.status)}>
                {getStatusIcon(systemHealth.database?.status)}
                <span className="ml-1">{systemHealth.database?.status || 'Unknown'}</span>
              </Badge>
              <div className="text-xs text-gray-500">
                {systemHealth.database?.connections || 0} connections
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#1a4a38]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <Network className="h-4 w-4 mr-2" />
              Network
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge className={getStatusColor(systemHealth.network?.status)}>
                {getStatusIcon(systemHealth.network?.status)}
                <span className="ml-1">{systemHealth.network?.status || 'Unknown'}</span>
              </Badge>
              <div className="text-xs text-gray-500">
                {systemHealth.network?.latency || 0}ms
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#1a4a38]">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center">
              <HardDrive className="h-4 w-4 mr-2" />
              Storage
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Usage</span>
                <span>{systemHealth.storage?.usagePercent || 0}%</span>
              </div>
              <Progress value={systemHealth.storage?.usagePercent || 0} className="h-2" />
              <div className="text-xs text-gray-500">
                {systemHealth.storage?.used || 0} / {systemHealth.storage?.total || 0} GB
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border border-[#1a4a38]">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Performance Metrics</CardTitle>
            <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
              Real-time system performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-[#f0f7f4] dark:bg-[#1a4a38] rounded-lg">
                <div className="text-2xl font-bold text-[#8bc34a]">
                  {systemMetrics.cpuUsage || 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">CPU Usage</div>
              </div>
              <div className="text-center p-3 bg-[#f0f7f4] dark:bg-[#1a4a38] rounded-lg">
                <div className="text-2xl font-bold text-[#2196f3]">
                  {systemMetrics.memoryUsage || 0}%
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Memory Usage</div>
              </div>
              <div className="text-center p-3 bg-[#f0f7f4] dark:bg-[#1a4a38] rounded-lg">
                <div className="text-2xl font-bold text-[#ff9800]">
                  {systemMetrics.activeUsers || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Active Users</div>
              </div>
              <div className="text-center p-3 bg-[#f0f7f4] dark:bg-[#1a4a38] rounded-lg">
                <div className="text-2xl font-bold text-[#9c27b0]">
                  {systemMetrics.requestsPerMinute || 0}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Requests/min</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#1a4a38]">
          <CardHeader>
            <CardTitle className="text-gray-900 dark:text-white">Recent Errors</CardTitle>
            <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
              Latest system errors and warnings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {errorLogs.length > 0 ? (
                errorLogs.slice(0, 5).map((log, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-[#f0f7f4] dark:bg-[#1a4a38] rounded-lg">
                    <AlertCircle className={`h-4 w-4 mt-0.5 ${
                      log.level === 'error' ? 'text-red-500' : 
                      log.level === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {log.message}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                  No recent errors
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Logs Table */}
      <Card className="border border-[#1a4a38]">
        <CardHeader>
          <CardTitle className="text-gray-900 dark:text-white">Error Logs</CardTitle>
          <CardDescription className="text-gray-600 dark:text-[#a8d5ba]">
            Detailed system error logs and debugging information
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center gap-4">
            <Input
              placeholder="Search logs..."
              className="max-w-sm"
            />
            <Button variant="outline" size="sm">
              Export Logs
            </Button>
          </div>
          
          <div className="rounded-md border border-[#1a4a38]">
            <Table>
              <TableHeader className="bg-[#f0f7f4] dark:bg-[#1a4a38]">
                <TableRow>
                  <TableHead className="font-semibold">Timestamp</TableHead>
                  <TableHead className="font-semibold">Level</TableHead>
                  <TableHead className="font-semibold">Service</TableHead>
                  <TableHead className="font-semibold">Message</TableHead>
                  <TableHead className="font-semibold">User</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {errorLogs.length > 0 ? (
                  errorLogs.map((log, index) => (
                    <TableRow key={index} className="hover:bg-[#f0f7f4] dark:hover:bg-[#1a4a38]">
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          log.level === 'error' ? 'bg-red-100 text-red-800' :
                          log.level === 'warning' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }>
                          {log.level}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.service || 'System'}</TableCell>
                      <TableCell className="text-sm max-w-md truncate">{log.message}</TableCell>
                      <TableCell className="text-sm">{log.user || 'System'}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                      <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
                      No error logs found
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SystemMonitor; 
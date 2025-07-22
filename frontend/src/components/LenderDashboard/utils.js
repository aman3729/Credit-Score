// Utility functions for LenderDashboard
import { api } from '../../lib/api';

export const searchUsers = async (query, setUsers, setLoading, toast, logout, navigate) => {
  if (!query.trim()) {
    setUsers([]);
    return;
  }
  try {
    setLoading(true);
    const response = await api.get(`/lenders/search-borrowers?search=${encodeURIComponent(query)}`);
    const usersList = Array.isArray(response.data.data) ? response.data.data : [];
    setUsers(usersList);
  } catch (err) {
    console.error('Error searching users:', err);
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
};

export const fetchUserCreditData = async (userId, setUserCreditData, setCreditDataError, setLoadingCreditData, toast) => {
  if (!userId) return;
  try {
    setLoadingCreditData(true);
    setCreditDataError(null);
    const response = await api.get(`/user/${userId}/credit-data`);
    const responseData = response.data.data || response.data;
    if (!responseData) throw new Error('No data received from server');
    let latestLendingDecision = responseData.lendingDecision;
    if (
      (!latestLendingDecision || Object.keys(latestLendingDecision).length === 0 || latestLendingDecision.decision === undefined)
      && Array.isArray(responseData.lendingDecisionHistory)
      && responseData.lendingDecisionHistory.length > 0
    ) {
      latestLendingDecision = responseData.lendingDecisionHistory[responseData.lendingDecisionHistory.length - 1];
    }
    setUserCreditData({
      userId,
      ...responseData,
      currentScore: responseData.currentScore,
      lendingDecision: latestLendingDecision,
    });
  } catch (err) {
    const errorMessage = err.response?.data?.error || err.message || 'Failed to load credit data';
    setCreditDataError(errorMessage);
    toast({
      title: 'Error',
      description: errorMessage,
      variant: 'destructive',
    });
  } finally {
    setLoadingCreditData(false);
  }
};

export const fetchDashboardMetrics = async (setDashboardMetrics, toast) => {
  try {
    const response = await api.get('/lenders/recent-decisions?limit=100');
    const decisions = response.data.data?.decisions || [];
    const approvedCount = decisions.filter(d => d.lendingDecision?.decision === 'Approve').length;
    const pendingCount = decisions.filter(d => d.lendingDecision?.decision === 'Review').length;
    const rejectedCount = decisions.filter(d => d.lendingDecision?.decision === 'Reject').length;
    setDashboardMetrics({
      approvedLoans: approvedCount,
      pendingLoans: pendingCount,
      rejectedLoans: rejectedCount,
      avgDecisionTime: '2.5m',
      riskBreakdown: { low: 35, medium: 45, high: 20 }
    });
  } catch (error) {
    setDashboardMetrics({
      approvedLoans: 0,
      pendingLoans: 0,
      rejectedLoans: 0,
      avgDecisionTime: '0m',
      riskBreakdown: { low: 0, medium: 0, high: 0 }
    });
    toast && toast({
      title: 'Error',
      description: 'Failed to fetch dashboard metrics',
      variant: 'destructive',
    });
  }
};

export const fetchRecentDecisions = async () => {
  try {
    const response = await api.get('/lenders/recent-decisions?limit=5');
    return response.data.data?.decisions || [];
  } catch (error) {
    return [];
  }
};

export const fetchAlerts = async (recentDecisions, setAlerts) => {
  try {
    const alerts = [];
    const highRiskCount = recentDecisions.filter(d => (d.creditScore?.fico?.score || 0) < 670).length;
    if (highRiskCount > 2) {
      alerts.push({
        type: 'critical',
        title: 'High Risk Applications',
        description: `${highRiskCount} high-risk applications in recent decisions`,
        time: '2 hours ago'
      });
    }
    setAlerts(alerts);
  } catch (error) {
    setAlerts([]);
  }
};

export const manualRefresh = async (fetchDashboardMetrics, fetchRecentDecisions, fetchAlerts, setDashboardMetrics, setRecentDecisions, setAlerts, toast, setRefreshing) => {
  setRefreshing(true);
  try {
    await fetchDashboardMetrics(setDashboardMetrics, toast);
    const recentDecisions = await fetchRecentDecisions();
    setRecentDecisions(recentDecisions);
    await fetchAlerts(recentDecisions, setAlerts);
    toast({
      title: 'Refreshed',
      description: 'Latest data has been refreshed',
      variant: 'default'
    });
  } catch (error) {
    toast({
      title: 'Refresh Failed',
      description: error.response?.data?.error || 'Failed to refresh data',
      variant: 'destructive'
    });
  } finally {
    setRefreshing(false);
  }
}; 
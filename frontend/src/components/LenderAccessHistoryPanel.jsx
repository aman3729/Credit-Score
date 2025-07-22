import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';

const LenderAccessHistoryPanel = () => {
  const [logs, setLogs] = useState([]);
  const [lenders, setLenders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filterLender, setFilterLender] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Fetch all logs and all lenders
  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([
      api.get('/users/lenders/all/access-history'),
      api.get('/users/lenders')
    ])
      .then(([logsRes, lendersRes]) => {
        setLogs(logsRes.data.data || []);
        setLenders(lendersRes.data.data || []);
      })
      .catch(() => setError('Failed to load access history or lenders'))
      .finally(() => setLoading(false));
  }, []);

  const filteredLogs = logs.filter(log => {
    const matchesLender = filterLender ? log.accessedBy === filterLender : true;
    const matchesUser = filterUser ? (log.targetUserId?.toLowerCase?.().includes(filterUser.toLowerCase()) || log.targetUserId === filterUser) : true;
    const matchesAction = filterAction ? log.action === filterAction : true;
    const matchesDate = filterDate ? (log.timestamp && log.timestamp.startsWith(filterDate)) : true;
    return matchesLender && matchesUser && matchesAction && matchesDate;
  });

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Lender Access History</h2>
      <div className="mb-4 flex flex-wrap gap-2 items-center">
        <select
          value={filterLender}
          onChange={e => setFilterLender(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        >
          <option value="">All Lenders</option>
          {lenders.map(lender => (
            <option key={lender._id} value={lender._id}>
              {lender.name || lender.email} ({lender.email})
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Filter by User ID"
          value={filterUser}
          onChange={e => setFilterUser(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        />
        <input
          type="date"
          value={filterDate}
          onChange={e => setFilterDate(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        />
        <select
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="border px-2 py-1 rounded text-sm"
        >
          <option value="">All Actions</option>
          <option value="Credit report accessed">Credit report accessed</option>
          <option value="User profile accessed">User profile accessed</option>
        </select>
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <table className="min-w-full text-xs border">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-2 py-1 border">Timestamp</th>
              <th className="px-2 py-1 border">Lender</th>
              <th className="px-2 py-1 border">Action</th>
              <th className="px-2 py-1 border">User ID</th>
              <th className="px-2 py-1 border">IP</th>
            </tr>
          </thead>
          <tbody>
            {filteredLogs.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-2">No access history found.</td></tr>
            ) : filteredLogs.map((log, i) => {
              const lender = lenders.find(l => l._id === log.accessedBy);
              return (
                <tr key={log._id || i}>
                  <td className="px-2 py-1 border">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
                  <td className="px-2 py-1 border">{lender ? `${lender.name || lender.email} (${lender.email})` : log.accessedBy}</td>
                  <td className="px-2 py-1 border">{log.action}</td>
                  <td className="px-2 py-1 border">{log.targetUserId}</td>
                  <td className="px-2 py-1 border">{log.ip}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default LenderAccessHistoryPanel; 
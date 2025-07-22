import React, { useState, useEffect } from 'react';
import { api } from "../lib/api";
import CreditScoreReport from './CreditScoreReport';

const Section = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>
    <div>{children}</div>
  </div>
);

const KeyValueTable = ({ data }) => (
  <table className="min-w-full text-sm border mb-2">
    <tbody>
      {Object.entries(data || {}).map(([key, value]) => (
        <tr key={key} className="border-b align-top">
          <td className="px-2 py-1 border font-medium whitespace-nowrap">{key}</td>
          <td className="px-2 py-1 border">
            {typeof value === 'object' && value !== null ? (
              <pre className="bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs overflow-x-auto max-h-40">{JSON.stringify(value, null, 2)}</pre>
            ) : String(value)}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

const ArrayTable = ({ data }) => (
  <pre className="bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs overflow-x-auto max-h-40">{JSON.stringify(data, null, 2)}</pre>
);

// Helper for formatting dates
const formatDate = (date) => date ? new Date(date).toLocaleString() : '—';
// Helper for formatting currency
const formatCurrency = (num) => typeof num === 'number' ? num.toLocaleString() : num || '—';
// Helper for boolean display
const YesNo = ({ value }) => (
  <span className={value ? 'text-green-600' : 'text-red-600'}>{value ? 'Yes' : 'No'}</span>
);

// Table for score factors
const ScoreFactorsTable = ({ factors }) => (
  <table className="min-w-full text-xs border mb-2">
    <thead>
      <tr className="bg-gray-100 dark:bg-gray-800">
        <th className="px-2 py-1 border">Factor</th>
        <th className="px-2 py-1 border">Impact</th>
      </tr>
    </thead>
    <tbody>
      {(factors || []).map(f => (
        <tr key={f._id || f.name}>
          <td className="px-2 py-1 border">{f.name}</td>
          <td className="px-2 py-1 border">
            <span className={
              f.impact === 'positive' ? 'text-green-600' :
              f.impact === 'negative' ? 'text-red-600' : 'text-gray-600'
            }>{f.impact}</span>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

// Table for lending decision history
const LendingDecisionTable = ({ history }) => (
  <table className="min-w-full text-xs border mb-2">
    <thead>
      <tr className="bg-gray-100 dark:bg-gray-800">
        <th className="px-2 py-1 border">Date</th>
        <th className="px-2 py-1 border">Decision</th>
        <th className="px-2 py-1 border">Max Loan</th>
        <th className="px-2 py-1 border">Reasons</th>
      </tr>
    </thead>
    <tbody>
      {(history || []).map((d, i) => (
        <tr key={d._id || i}>
          <td className="px-2 py-1 border">{formatDate(d.evaluatedAt)}</td>
          <td className="px-2 py-1 border">{d.decision}</td>
          <td className="px-2 py-1 border">{formatCurrency(d.maxLoanAmount)}</td>
          <td className="px-2 py-1 border">{(d.reasons || []).join(', ')}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// Table for score history
const ScoreHistoryTable = ({ history }) => (
  <table className="min-w-full text-xs border mb-2">
    <thead>
      <tr className="bg-gray-100 dark:bg-gray-800">
        <th className="px-2 py-1 border">Date</th>
        <th className="px-2 py-1 border">Score</th>
        <th className="px-2 py-1 border">Classification</th>
      </tr>
    </thead>
    <tbody>
      {(history || []).map((s, i) => (
        <tr key={s._id || i}>
          <td className="px-2 py-1 border">{formatDate(s.date)}</td>
          <td className="px-2 py-1 border">{s.score}</td>
          <td className="px-2 py-1 border">{s.classification}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

// Table for premium features
const PremiumFeaturesTable = ({ features }) => (
  <table className="min-w-full text-xs border mb-2">
    <thead>
      <tr className="bg-gray-100 dark:bg-gray-800">
        <th className="px-2 py-1 border">Feature</th>
        <th className="px-2 py-1 border">Enabled</th>
      </tr>
    </thead>
    <tbody>
      {Object.entries(features || {}).map(([feature, enabled]) => (
        <tr key={feature}>
          <td className="px-2 py-1 border">{feature.replace(/([A-Z])/g, ' $1')}</td>
          <td className="px-2 py-1 border"><YesNo value={enabled} /></td>
        </tr>
      ))}
    </tbody>
  </table>
);

const AdminUserDetails = ({ user, onClose, onUpdate, onDelete }) => {
  const [editedUser, setEditedUser] = useState(user);
  const [newFactor, setNewFactor] = useState({ name: '', impact: 'neutral', description: '' });
  const [showRaw, setShowRaw] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [accessHistory, setAccessHistory] = useState([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState(null);
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate] = useState('');

  // Fetch lender access history if user is a lender and tab is active
  useEffect(() => {
    if (user.role === 'lender' && activeTab === 'access') {
      setAccessLoading(true);
      setAccessError(null);
      api.get(`/api/v1/users/lenders/${user._id}/access-history`)
        .then(res => setAccessHistory(res.data.data || []))
        .catch(err => setAccessError('Failed to load access history'))
        .finally(() => setAccessLoading(false));
    }
  }, [user, activeTab]);

  // Filtered access history
  const filteredAccessHistory = accessHistory.filter(log => {
    const matchesUser = filterUser ? (log.targetUserId?.toLowerCase?.().includes(filterUser.toLowerCase()) || log.targetUserId === filterUser) : true;
    const matchesAction = filterAction ? log.action === filterAction : true;
    const matchesDate = filterDate ? (log.timestamp && log.timestamp.startsWith(filterDate)) : true;
    return matchesUser && matchesAction && matchesDate;
  });

  const handleScoreChange = (e) => {
    const score = parseInt(e.target.value);
    if (score >= 300 && score <= 850) {
      setEditedUser({
        ...editedUser,
        creditScore: {
          ...editedUser.creditScore,
          score
        }
      });
    }
  };

  const handleFactorAdd = () => {
    if (newFactor.name && newFactor.description) {
      setEditedUser({
        ...editedUser,
        creditScore: {
          ...editedUser.creditScore,
          factors: [...(editedUser.creditScore?.factors || []), newFactor]
        }
      });
      setNewFactor({ name: '', impact: 'neutral', description: '' });
    }
  };

  const handleFactorDelete = (index) => {
    const newFactors = [...editedUser.creditScore.factors];
    newFactors.splice(index, 1);
    setEditedUser({
      ...editedUser,
      creditScore: {
        ...editedUser.creditScore,
        factors: newFactors
      }
    });
  };

  const handleSave = async () => {
    try {
      await api.patch(`/api/v1/admin/users/${user._id}`, editedUser);
      onUpdate(editedUser);
      alert('User data updated successfully');
    } catch (error) {
      alert('Failed to update user data');
    }
  };

  // Helper to render a section if data exists
  const renderSection = (title, data) => {
    if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) return null;
    return <Section title={title}><KeyValueTable data={data} /></Section>;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <span className="text-2xl">×</span>
            </button>
          </div>

          {/* Tabs */}
          {user.role === 'lender' ? (
            <div className="mb-6 flex space-x-4 border-b">
              <button
                className={`pb-2 px-4 font-semibold ${activeTab === 'details' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab('details')}
              >Details</button>
              <button
                className={`pb-2 px-4 font-semibold ${activeTab === 'access' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
                onClick={() => setActiveTab('access')}
              >Lender Access History</button>
            </div>
          ) : null}

          {/* Details Tab */}
          {(activeTab === 'details' || user.role !== 'lender') && (
            <>
              {/* Profile Section */}
              {renderSection('Profile', {
                name: user.name,
                username: user.username,
                email: user.email,
                phoneNumber: user.phoneNumber,
                nationalId: user.nationalId,
                status: user.status,
                emailVerified: user.emailVerified,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                updatedAt: user.updatedAt,
                ...user.profile
              })}

              {/* Financial Section */}
              {renderSection('Financial', {
                monthlyIncome: user.monthlyIncome,
                monthlySavings: user.monthlySavings,
                totalDebt: user.totalDebt,
                bankBalance: user.bankBalance,
                mobileMoneyBalance: user.mobileMoneyBalance
              })}

              {/* Credit Score Section */}
              {user.creditScore && (
                <Section title="Credit Score">
                  <div className="mb-2">
                    <b>FICO Score:</b> {user.creditScore.fico?.score} ({user.creditScore.fico?.version})<br />
                    <b>Classification:</b> {user.creditScore.classification || '—'}<br />
                    <b>Last Updated:</b> {formatDate(user.creditScore.fico?.lastUpdated)}
                  </div>
                  <ScoreFactorsTable factors={user.creditScore.factors} />
                </Section>
              )}

              {/* Credit Report Section */}
              {user.creditReport && (
                <Section title="Credit Report">
                  <KeyValueTable data={{
                    'Credit Utilization': user.creditReport.creditUtilization?.overall ? (user.creditReport.creditUtilization.overall * 100).toFixed(1) + '%': '—',
                    'Credit Age (months)': user.creditReport.creditAgeMonths,
                    'Credit Mix': user.creditReport.creditMix,
                    'Open Accounts': user.creditReport.openAccounts,
                    'Last Active Date': formatDate(user.creditReport.lastActiveDate),
                    ...user.creditReport.personalInfo && { 'Personal Info': user.creditReport.personalInfo }
                  }} />
                  {user.creditReport.lendingDecisionHistory && (
                    <div className="mt-2">
                      <div className="font-semibold mb-1">Lending Decision History</div>
                      <LendingDecisionTable history={user.creditReport.lendingDecisionHistory} />
                    </div>
                  )}
                </Section>
              )}

              {/* Risk Factors Section */}
              {user.creditReport && user.creditReport.riskFactors && (
                <Section title="Risk Factors">
                  <ArrayTable data={user.creditReport.riskFactors} />
                </Section>
              )}

              {/* Score History Section */}
              {user.scoreHistory && user.scoreHistory.length > 0 && (
                <Section title="Score History">
                  <ScoreHistoryTable history={user.scoreHistory} />
                </Section>
              )}

              {/* Risk Flags Section */}
              {user.riskFlags && user.riskFlags.length > 0 && (
                <Section title="Risk Flags">
                  <ArrayTable data={user.riskFlags} />
                </Section>
              )}

              {/* Premium Features Section */}
              {user.premium && user.premium.features && (
                <Section title="Premium Features">
                  <PremiumFeaturesTable features={user.premium.features} />
                </Section>
              )}

              {/* Admin Fields */}
              {user.adminFields && renderSection('Admin Fields', user.adminFields)}

              {/* Legal Consent */}
              {user.legalConsent && renderSection('Legal Consent', user.legalConsent)}

              {/* Preferences */}
              {user.preferences && renderSection('Preferences', user.preferences)}

              {/* Metadata */}
              {user.metadata && renderSection('Metadata', user.metadata)}
            </>
          )}

          {/* Access History Tab */}
          {user.role === 'lender' && activeTab === 'access' && (
            <Section title="Lender Access History">
              <div className="mb-4 flex flex-wrap gap-2 items-center">
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
              {accessLoading ? (
                <div>Loading...</div>
              ) : accessError ? (
                <div className="text-red-600">{accessError}</div>
              ) : (
                <table className="min-w-full text-xs border">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="px-2 py-1 border">Timestamp</th>
                      <th className="px-2 py-1 border">Action</th>
                      <th className="px-2 py-1 border">User ID</th>
                      <th className="px-2 py-1 border">IP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAccessHistory.length === 0 ? (
                      <tr><td colSpan={4} className="text-center py-2">No access history found.</td></tr>
                    ) : filteredAccessHistory.map((log, i) => (
                      <tr key={log._id || i}>
                        <td className="px-2 py-1 border">{log.timestamp ? new Date(log.timestamp).toLocaleString() : ''}</td>
                        <td className="px-2 py-1 border">{log.action}</td>
                        <td className="px-2 py-1 border">{log.targetUserId}</td>
                        <td className="px-2 py-1 border">{log.ip}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Section>
          )}

          {/* Raw Data Section */}
          <div className="mb-6">
            <button
              className="text-blue-600 underline text-sm mb-2"
              onClick={() => setShowRaw((v) => !v)}
            >
              {showRaw ? 'Hide Raw JSON' : 'Show Raw JSON'}
            </button>
            {showRaw && (
              <pre className="bg-gray-100 dark:bg-gray-900 rounded p-2 text-xs overflow-x-auto max-h-96 border">
                {JSON.stringify(user, null, 2)}
              </pre>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 mt-8">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400"
            >
              Close
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to delete this user?')) {
                  onDelete(user._id);
                }
              }}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Delete User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminUserDetails; 
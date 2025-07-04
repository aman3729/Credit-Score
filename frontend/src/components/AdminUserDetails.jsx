import React, { useState } from 'react';
import { api } from "../lib/api";
import CreditScoreReport from './CreditScoreReport';

const AdminUserDetails = ({ user, onClose, onUpdate, onDelete }) => {
  const [editedUser, setEditedUser] = useState(user);
  const [newFactor, setNewFactor] = useState({ name: '', impact: 'neutral', description: '' });

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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">User Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={editedUser.username}
                onChange={(e) => setEditedUser({ ...editedUser, username: e.target.value })}
                className="w-full p-2 border rounded-md dark:bg-dark-secondary dark:border-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={editedUser.email}
                onChange={(e) => setEditedUser({ ...editedUser, email: e.target.value })}
                className="w-full p-2 border rounded-md dark:bg-dark-secondary dark:border-gray-600"
              />
            </div>
          </div>

          {/* Credit Score */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Credit Score
            </label>
            <input
              type="number"
              min="300"
              max="850"
              value={editedUser.creditScore?.score || ''}
              onChange={handleScoreChange}
              className="w-full p-2 border rounded-md dark:bg-dark-secondary dark:border-gray-600"
            />
          </div>

          {/* Credit Factors */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Credit Factors</h3>
            <div className="space-y-4">
              {editedUser.creditScore?.factors?.map((factor, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <input
                    type="text"
                    value={factor.name}
                    onChange={(e) => {
                      const newFactors = [...editedUser.creditScore.factors];
                      newFactors[index] = { ...factor, name: e.target.value };
                      setEditedUser({
                        ...editedUser,
                        creditScore: { ...editedUser.creditScore, factors: newFactors }
                      });
                    }}
                    className="flex-1 p-2 border rounded-md dark:bg-dark-secondary dark:border-gray-600"
                  />
                  <select
                    value={factor.impact}
                    onChange={(e) => {
                      const newFactors = [...editedUser.creditScore.factors];
                      newFactors[index] = { ...factor, impact: e.target.value };
                      setEditedUser({
                        ...editedUser,
                        creditScore: { ...editedUser.creditScore, factors: newFactors }
                      });
                    }}
                    className="p-2 border rounded-md dark:bg-dark-secondary dark:border-gray-600"
                  >
                    <option value="positive">Positive</option>
                    <option value="neutral">Neutral</option>
                    <option value="negative">Negative</option>
                  </select>
                  <button
                    onClick={() => handleFactorDelete(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </div>
              ))}

              {/* Add New Factor */}
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="New factor name"
                  value={newFactor.name}
                  onChange={(e) => setNewFactor({ ...newFactor, name: e.target.value })}
                  className="flex-1 p-2 border rounded-md dark:bg-dark-secondary dark:border-gray-600"
                />
                <select
                  value={newFactor.impact}
                  onChange={(e) => setNewFactor({ ...newFactor, impact: e.target.value })}
                  className="p-2 border rounded-md dark:bg-dark-secondary dark:border-gray-600"
                >
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
                <button
                  onClick={handleFactorAdd}
                  className="text-green-600 hover:text-green-800"
                >
                  <i className="fas fa-plus"></i>
                </button>
              </div>
            </div>
          </div>

          {/* Lending Decision History */}
          {user.creditReport?.lendingDecisionHistory && user.creditReport.lendingDecisionHistory.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">Lending Decision History</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-800">
                      <th className="px-2 py-1 border">Decision</th>
                      <th className="px-2 py-1 border">Date</th>
                      <th className="px-2 py-1 border">Evaluator</th>
                      <th className="px-2 py-1 border">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {user.creditReport.lendingDecisionHistory.map((entry, idx) => (
                      <tr key={idx} className="border-b">
                        <td className="px-2 py-1 border">{entry.decision}</td>
                        <td className="px-2 py-1 border">{entry.evaluatedAt ? new Date(entry.evaluatedAt).toLocaleString() : ''}</td>
                        <td className="px-2 py-1 border">{entry.evaluatedBy || ''}</td>
                        <td className="px-2 py-1 border">{entry.manualNotes || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end space-x-4">
            <CreditScoreReport
              score={editedUser.creditScore?.score}
              factors={editedUser.creditScore?.factors}
              history={editedUser.creditScore?.history}
              username={editedUser.username}
            />
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Save Changes
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
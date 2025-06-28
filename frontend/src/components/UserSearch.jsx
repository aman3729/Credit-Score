import React, { useState } from 'react';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

const UserSearch = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [error, setError] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e?.preventDefault();
    
    if (query.trim().length < 2) {
      setError('Search must be at least 2 characters.');
      return;
    }
    
    try {
      setIsSearching(true);
      setError(null);
      const res = await api.get(`/admin/search-users?q=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch (err) {
      console.error('Search error:', err);
      setError(err.response?.data?.error || 'Failed to search users');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 bg-white dark:bg-dark-card rounded-lg shadow">
      <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">Search Users</h2>
      <form onSubmit={handleSearch} className="mb-4">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            className="flex-1 border rounded-lg px-4 py-2 dark:bg-gray-800 dark:border-gray-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Search by name, email, or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isSearching}
          />
          <button 
            type="submit" 
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            disabled={isSearching || query.trim().length < 2}
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>
      
      {results.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">Results ({results.length})</h3>
          <div className="space-y-2">
            {results.map(user => (
              <div
                key={user._id}
                onClick={() => navigate(`/admin/users/${user._id}`)}
                className="cursor-pointer p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                  <div className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {user.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {results.length === 0 && query.length >= 2 && !isSearching && !error && (
        <div className="mt-4 text-center py-4 text-gray-500 dark:text-gray-400">
          No users found matching your search.
        </div>
      )}
    </div>
  );
};

export default UserSearch;

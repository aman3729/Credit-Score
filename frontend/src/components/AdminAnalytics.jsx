import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const AdminAnalytics = ({ users }) => {
  // Calculate credit score tiers
  const calculateTiers = () => {
    const tiers = {
      'Poor (300-579)': 0,
      'Fair (580-669)': 0,
      'Good (670-739)': 0,
      'Very Good (740-799)': 0,
      'Excellent (800-850)': 0
    };

    users.forEach(user => {
      const score = user.creditScore?.score;
      if (score) {
        if (score < 580) tiers['Poor (300-579)']++;
        else if (score < 670) tiers['Fair (580-669)']++;
        else if (score < 740) tiers['Good (670-739)']++;
        else if (score < 800) tiers['Very Good (740-799)']++;
        else tiers['Excellent (800-850)']++;
      }
    });

    return Object.entries(tiers).map(([name, value]) => ({ name, value }));
  };

  // Calculate top users by growth
  const calculateTopGrowth = () => {
    return users
      .filter(user => user.creditScore?.history?.length > 1)
      .map(user => {
        const history = user.creditScore.history;
        const growth = history[history.length - 1].score - history[0].score;
        return {
          username: user.username,
          growth,
          currentScore: history[history.length - 1].score
        };
      })
      .sort((a, b) => b.growth - a.growth)
      .slice(0, 5);
  };

  // Calculate monthly averages
  const calculateMonthlyAverages = () => {
    const monthlyScores = {};
    
    users.forEach(user => {
      user.creditScore?.history?.forEach(record => {
        const date = new Date(record.date);
        const monthYear = date.toLocaleString('default', { month: 'short', year: 'numeric' });
        
        if (!monthlyScores[monthYear]) {
          monthlyScores[monthYear] = { total: 0, count: 0 };
        }
        
        monthlyScores[monthYear].total += record.score;
        monthlyScores[monthYear].count++;
      });
    });

    return Object.entries(monthlyScores)
      .map(([month, data]) => ({
        month,
        average: Math.round(data.total / data.count)
      }))
      .slice(-6); // Last 6 months
  };

  const tierData = calculateTiers();
  const topGrowth = calculateTopGrowth();
  const monthlyAverages = calculateMonthlyAverages();

  return (
    <div className="space-y-6">
      {/* Credit Score Distribution */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Credit Score Distribution
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3B82F6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Growth Users */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Top 5 Users by Score Growth
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Growth
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Current Score
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {topGrowth.map((user, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {user.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-sm ${
                      user.growth > 0
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {user.growth > 0 ? '+' : ''}{user.growth}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                    {user.currentScore}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Monthly Trends */}
      <div className="bg-white dark:bg-dark-card rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
          Monthly Average Score Trends
        </h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyAverages}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[300, 850]} />
              <Tooltip />
              <Bar dataKey="average" fill="#10B981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminAnalytics; 
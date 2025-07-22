import React from 'react';
import { FiFileText, FiEye, FiCreditCard, FiCheckCircle } from 'react-icons/fi';

const getActivityIcon = (action) => {
  if (action.toLowerCase().includes('updated')) return <FiCheckCircle className="w-5 h-5 text-green-500" />;
  if (action.toLowerCase().includes('viewed')) return <FiEye className="w-5 h-5 text-blue-500" />;
  if (action.toLowerCase().includes('inquiry')) return <FiCreditCard className="w-5 h-5 text-purple-500" />;
  return <FiFileText className="w-5 h-5 text-gray-500" />;
};

const RecentActivity = ({ activities }) => {
  if (!activities || activities.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-black rounded-xl shadow-sm p-6 transition-colors duration-200">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h2>
        <button className="text-sm text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300">
          View All
        </button>
      </div>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start group">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center transition-colors duration-200">
              {getActivityIcon(activity.action)}
            </div>
            <div className="ml-4 flex-1">
              <div className="flex justify-between">
                <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {activity.action}
                </p>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {activity.date}
                </span>
              </div>
              {activity.change && (
                <span 
                  className={`text-xs font-medium inline-flex items-center mt-1 ${
                    activity.change.startsWith('+') 
                      ? 'text-green-600 dark:text-green-400' 
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {activity.change}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default React.memo(RecentActivity);

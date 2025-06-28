import React from 'react';

const Recommendations = ({ recommendations }) => {
  // Handle loading or missing data
  if (!recommendations) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          <i className="fas fa-clipboard-list text-green-500 dark:text-green-400 mr-2"></i>
          Recommendations
        </h2>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-start">
              <div className="w-full h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Handle empty recommendations
  if (!recommendations.length) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-6">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
          <i className="fas fa-clipboard-list text-green-500 dark:text-green-400 mr-2"></i>
          Recommendations
        </h2>
        <p className="text-gray-500 dark:text-gray-400">No recommendations available at the moment.</p>
      </div>
    );
  }
  return (
    <div className="bg-white dark:bg-dark-card rounded-2xl shadow-xl p-6 transition-colors duration-200">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-4">
        <i className="fas fa-clipboard-list text-green-500 dark:text-green-400 mr-2"></i>
        Recommendations
      </h2>
      <div className="space-y-3">
        {recommendations.filter(Boolean).map((rec, index) => (
          <div key={index} className="flex items-start">
            <div className="flex-shrink-0 mt-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-dark-secondary flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 font-bold text-xs">{index + 1}</span>
              </div>
            </div>
            <p className="ml-3 text-gray-700 dark:text-gray-300">{rec}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Recommendations;
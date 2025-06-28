import React from 'react';

const CreditFactorCard = ({ name, icon, score, status, description }) => {
  const getStatusColor = (status) => {
    // Handle undefined, null, or non-string status
    const statusStr = String(status || '').toLowerCase();
    
    switch (statusStr) {
      case 'excellent':
        return { 
          backgroundColor: 'bg-green-100 dark:bg-green-900/30', 
          textColor: 'text-green-800 dark:text-green-200' 
        };
      case 'good':
        return { 
          backgroundColor: 'bg-blue-100 dark:bg-blue-900/30', 
          textColor: 'text-blue-800 dark:text-blue-200' 
        };
      case 'fair':
        return { 
          backgroundColor: 'bg-yellow-100 dark:bg-yellow-900/30', 
          textColor: 'text-yellow-800 dark:text-yellow-200' 
        };
      case 'poor':
        return { 
          backgroundColor: 'bg-red-100 dark:bg-red-900/30', 
          textColor: 'text-red-800 dark:text-red-200' 
        };
      default:
        return { 
          backgroundColor: 'bg-gray-100 dark:bg-gray-700', 
          textColor: 'text-gray-800 dark:text-gray-200' 
        };
    }
  };

  const statusColors = getStatusColor(status);

  const getScoreColor = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-blue-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };
  
  const getScoreColorDark = (score) => {
    if (score >= 90) return 'bg-green-400';
    if (score >= 70) return 'bg-blue-400';
    if (score >= 50) return 'bg-yellow-400';
    return 'bg-red-400';
  };
  
  const getScoreTextColor = (score) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-blue-600 dark:text-blue-400';
    if (score >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm transition-colors duration-200">
      <div className="flex items-start">
        <div className="p-2 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
          {icon}
        </div>
        <div className="ml-4 flex-1">
          <div className="flex justify-between items-start">
            <h3 className="font-medium text-gray-900 dark:text-white">{name}</h3>
            <div className={`text-sm font-medium px-2.5 py-0.5 rounded-full ${statusColors.backgroundColor} ${statusColors.textColor}`}>
              {status}
            </div>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>
          
          <div className="mt-3">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-300 mb-1">
              <span>0%</span>
              <span>100%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-full rounded-full ${document.documentElement.classList.contains('dark') ? getScoreColorDark(score) : getScoreColor(score)}`}
                style={{
                  width: `${score}%`
                }}
              />
            </div>
            <p className={`mt-1 text-right text-xs font-medium ${getScoreTextColor(score)}`}>
              Score: {score}/100
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditFactorCard;

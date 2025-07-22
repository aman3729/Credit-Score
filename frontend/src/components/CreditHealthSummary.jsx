import React from 'react';
import { FiAlertTriangle, FiCheckCircle, FiInfo } from 'react-icons/fi';

const CreditHealthSummary = ({ score = 755, factors = {} }) => {
  // Ensure factors is always an object
  const safeFactors = factors && typeof factors === 'object' ? factors : {};
  
  // Convert factors to array for counting
  const factorsArray = Array.isArray(safeFactors) 
    ? safeFactors 
    : Object.entries(safeFactors).map(([name, status]) => ({
        name,
        status: typeof status === 'string' ? status : 'unknown'
      }));
  const getHealthStatus = () => {
    if (score >= 740) return {
      status: 'Excellent',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      icon: <FiCheckCircle className="w-5 h-5 text-green-500 dark:text-green-400" />,
      description: 'Your credit health is in great shape! Keep up the good work.'
    };
    if (score >= 670) return {
      status: 'Good',
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      icon: <FiInfo className="w-5 h-5 text-blue-500 dark:text-blue-400" />,
      description: 'Your credit health is good, but there\'s room for improvement.'
    };
    return {
      status: 'Needs Attention',
      color: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      icon: <FiAlertTriangle className="w-5 h-5 text-yellow-500 dark:text-yellow-400" />,
      description: 'Your credit health needs attention. Consider taking steps to improve your score.'
    };
  };

  const health = getHealthStatus();
  const positiveFactors = factorsArray.filter(f => 
    f.status && typeof f.status === 'string' && 
    (f.status.toLowerCase() === 'excellent' || f.status.toLowerCase() === 'good')
  ).length;
  
  const totalFactors = Math.max(factorsArray.length, 1); // Prevent division by zero
  const positivePercentage = Math.round((positiveFactors / totalFactors) * 100);

  return (
    <div className="bg-white dark:bg-black rounded-xl shadow-sm p-6 transition-colors duration-200">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Credit Health Summary</h2>
      
      <div className={`${health.bgColor} dark:bg-black rounded-lg p-4 mb-6`}>
        <div className="flex">
          <div className="flex-shrink-0">
            {health.icon}
          </div>
          <div className="ml-3">
            <h3 className={`text-sm font-medium ${health.color} dark:text-white`}>
              {health.status} Credit Health
            </h3>
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              <p>{health.description}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600 dark:text-gray-300">Positive Factors</span>
            <span className="font-medium text-gray-900 dark:text-white">{positivePercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="h-full rounded-full bg-green-500 dark:bg-green-400" 
              style={{ width: `${positivePercentage}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {positiveFactors} out of {totalFactors} factors are in good standing
          </p>
        </div>

        <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Quick Actions</h4>
          <div className="grid grid-cols-2 gap-3">
            <button className="text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-lg px-3 py-2 text-center transition-colors duration-200">
              View Full Report
            </button>
            <button className="text-sm font-medium text-gray-700 hover:text-gray-600 dark:text-gray-300 dark:hover:text-gray-200 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg px-3 py-2 text-center transition-colors duration-200">
              Dispute Error
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreditHealthSummary;

import React from 'react';

const FactorCard = ({ factor, isSelected, onClick }) => {
  // Add null check for factor
  if (!factor) {
    return (
      <div className="bg-white dark:bg-dark-card rounded-xl shadow-md p-4 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
      </div>
    );
  }
  return (
    <div 
      className={`bg-white dark:bg-dark-card rounded-xl shadow-md p-4 transition-all cursor-pointer hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-center">
        <div className="flex items-center">
          {factor.icon && (
          <i className={`${factor.icon} text-blue-500 dark:text-blue-400 mr-2`}></i>
        )}
          <h3 className="font-medium text-gray-800 dark:text-gray-200">{factor.name}</h3>
        </div>
        <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">{factor.value}%</span>
      </div>
      <div className="mt-3 flex items-center">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-blue-600 dark:bg-blue-500 h-2.5 rounded-full progress-bar" 
            style={{ width: `${factor.current || 0}%` }}
          ></div>
        </div>
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">{factor.current}%</span>
      </div>
      {isSelected && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-dark-secondary rounded-lg text-sm text-gray-700 dark:text-gray-300 animate-fadeIn">
          <i className="fas fa-lightbulb text-yellow-500 mr-2"></i>
          {factor.tip}
        </div>
      )}
    </div>
  );
};

export default FactorCard;
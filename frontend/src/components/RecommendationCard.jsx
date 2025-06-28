import React from 'react';
import { FiArrowRight, FiAlertCircle } from 'react-icons/fi';

const RecommendationCard = ({ title, description, action }) => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start">
        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <FiAlertCircle className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div className="ml-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{description}</p>
          <div className="mt-3">
            <button className="inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors group">
              {action}
              <FiArrowRight className="ml-1.5 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RecommendationCard;

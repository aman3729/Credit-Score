import React from 'react';
import { FiCheckCircle } from 'react-icons/fi';

const recommendations = [
  {
    id: 1,
    title: 'Increase Credit Limit',
    description: 'Requesting a credit limit increase can help lower your credit utilization ratio.',
    action: 'Learn more'
  },
  {
    id: 2,
    title: 'Keep Old Accounts Open',
    description: 'Your oldest credit account is 5 years old. Keeping it open helps your credit history length.',
    action: 'View accounts'
  }
];

const Recommendations = () => (
  <>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Recommendations</h3>
      <button className="text-sm text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
        View all
      </button>
    </div>
    <div className="space-y-4">
      {recommendations.map((rec) => (
        <div key={rec.id} className="flex items-start">
          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <FiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
          </div>
          <div className="ml-4">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white">{rec.title}</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400">{rec.description}</p>
            <button className="mt-1 text-sm font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
              {rec.action}
            </button>
          </div>
        </div>
      ))}
    </div>
  </>
);

export default Recommendations;

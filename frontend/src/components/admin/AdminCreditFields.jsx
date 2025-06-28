import React from 'react';

export default function AdminCreditFields() {
  return (
    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md mb-4">
      <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Admin Credit Factors</h3>
      <input 
        type="number"
        placeholder="Manual Score Adjustment" 
        className="w-full border border-gray-300 dark:border-gray-600 p-2 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
      />
    </div>
  );
}

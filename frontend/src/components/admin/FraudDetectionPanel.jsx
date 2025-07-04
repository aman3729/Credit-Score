import React from 'react';

const FraudDetectionPanel = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Fraud Detection Panel</h2>
      <p className="mb-4 text-gray-600 dark:text-gray-400">View flagged users, set thresholds, and investigate fraud signals.</p>
      {/* TODO: Implement fraud detection UI */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center text-gray-500 dark:text-gray-400">
        Fraud detection tools will appear here.
      </div>
    </div>
  );
};

export default FraudDetectionPanel; 
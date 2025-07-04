import React from 'react';

const CompliancePanel = () => {
  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Consent & Compliance Panel</h2>
      <p className="mb-4 text-gray-600 dark:text-gray-400">View user consent, generate compliance reports, and manage access requests.</p>
      {/* TODO: Implement compliance management UI */}
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg text-center text-gray-500 dark:text-gray-400">
        Compliance management tools will appear here.
      </div>
    </div>
  );
};

export default CompliancePanel; 
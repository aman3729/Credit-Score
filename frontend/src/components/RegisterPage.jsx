import React from 'react';
import EnhancedRegister from './EnhancedRegister';

const RegisterPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <EnhancedRegister
      isAdmin={false}
      onSuccess={() => { /* Optionally redirect to login or show a message */ }}
      onClose={() => { /* Optionally redirect to login */ }}
      showPendingMessage={true}
    />
  </div>
);

export default RegisterPage; 
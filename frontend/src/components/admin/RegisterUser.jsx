// RegisterUser.jsx
import React from 'react';
import EnhancedRegister from '../EnhancedRegister';

const RegisterUser = ({ open = false, onClose, onSuccess }) => {
  if (!open) return null;

  return (
    <EnhancedRegister
      isAdmin={true}
      onSuccess={onSuccess}
      onClose={onClose}
      showPendingMessage={false}
    />
  );
};

export default RegisterUser;
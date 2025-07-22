import React from 'react';
import EnhancedRegister from './EnhancedRegister';
import StarryBackground from './StarryBackground';

const RegisterPage = () => {
  return (
    <>
      <StarryBackground />
      <div
        className="fixed inset-0 min-h-screen min-w-0 flex items-center justify-center overflow-hidden animate-fade-in-slow"
        style={{ position: 'relative', zIndex: 1 }}
      >
        <EnhancedRegister />
      </div>
    </>
  );
};

export default RegisterPage; 
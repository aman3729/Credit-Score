import React, { useState } from 'react';
import api from '../utils/api';

const EmailVerificationBanner = ({ email }) => {
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState(null);

  const handleResendVerification = async () => {
    try {
      setIsResending(true);
      await api.post('/resend-verification');
      setMessage({
        type: 'success',
        text: 'Verification email sent! Please check your inbox.'
      });
    } catch (error) {
      setMessage({
        type: 'error',
        text: 'Failed to resend verification email. Please try again later.'
      });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-400 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <i className="fas fa-exclamation-triangle text-yellow-400"></i>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700 dark:text-yellow-200">
              Please verify your email address ({email}). 
              {message && (
                <span className={`ml-2 ${
                  message.type === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}>
                  {message.text}
                </span>
              )}
            </p>
          </div>
        </div>
        <div>
          <button
            onClick={handleResendVerification}
            disabled={isResending}
            className={`px-3 py-1 text-sm font-medium rounded-md ${
              isResending
                ? 'bg-gray-300 dark:bg-gray-700 cursor-not-allowed'
                : 'bg-yellow-200 dark:bg-yellow-800 hover:bg-yellow-300 dark:hover:bg-yellow-700'
            }`}
          >
            {isResending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-1"></i>
                Sending...
              </>
            ) : (
              'Resend Verification'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationBanner; 
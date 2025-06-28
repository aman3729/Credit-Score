import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

const EmailVerification = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');
  const token = searchParams.get('token');

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        await api.get(`/verify-email/${token}`);
        setStatus('success');
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      } catch (error) {
        setStatus('error');
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
    }
  }, [token, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-dark-primary">
      <div className="bg-white dark:bg-dark-card p-8 rounded-lg shadow-lg max-w-md w-full">
        {status === 'verifying' && (
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
            <h2 className="text-2xl font-bold mt-4 text-gray-800 dark:text-gray-200">
              Verifying Email
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Please wait while we verify your email address...
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="text-green-500 text-6xl mb-4">
              <i className="fas fa-check-circle"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Email Verified!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Your email has been successfully verified. Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="text-red-500 text-6xl mb-4">
              <i className="fas fa-times-circle"></i>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
              Verification Failed
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              The verification link is invalid or has expired. Please request a new verification link.
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailVerification; 
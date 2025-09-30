import React, { useEffect, useState } from 'react';
import axios from 'axios';

const EmailVerification = () => {
  const [message, setMessage] = useState('Verifying...');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      axios.get(`/api/auth/verify-email?token=${token}`)
        .then(res => setMessage(res.data.message))
        .catch(err => setMessage(err.response?.data?.message || 'Verification failed'));
    } else {
      setMessage('No token provided');
    }
  }, []);

  return (
    <div>
      <h2>Email Verification</h2>
      <p>{message}</p>
    </div>
  );
};

export default EmailVerification; 
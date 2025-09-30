import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import api from '../../utils/api';

/**
 * EmailVerification component for handling email verification
 */
const EmailVerification = () => {
  const [status, setStatus] = useState('verifying'); // verifying, success, error
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verifyEmail = async () => {
      try {
        setIsLoading(true);
        
        const response = await api.get(`/auth/verify-email/${token}`);
        
        setStatus('success');
        setMessage('Email verified successfully! You can now log in to your account.');
        
        toast({
          title: 'Email Verified',
          description: 'Your email has been verified successfully.',
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
        
      } catch (error) {
        setStatus('error');
        setMessage(error.response?.data?.message || 'Email verification failed. Please try again.');
        
        toast({
          title: 'Verification Failed',
          description: error.response?.data?.message || 'Email verification failed.',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      verifyEmail();
    } else {
      setStatus('error');
      setMessage('Invalid verification link.');
      setIsLoading(false);
    }
  }, [token, navigate, toast]);

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-12 w-12 text-green-500" />;
      case 'error':
        return <XCircle className="h-12 w-12 text-red-500" />;
      default:
        return <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'success':
        return 'text-green-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-blue-600';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <div className="flex justify-center mb-4">
            {getStatusIcon()}
          </div>
          <CardTitle className={`text-2xl font-bold text-center ${getStatusColor()}`}>
            {status === 'verifying' && 'Verifying Email'}
            {status === 'success' && 'Email Verified'}
            {status === 'error' && 'Verification Failed'}
          </CardTitle>
          <CardDescription className="text-center">
            {status === 'verifying' && 'Please wait while we verify your email address...'}
            {status === 'success' && 'Your email has been verified successfully'}
            {status === 'error' && 'We encountered an issue verifying your email'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            {message}
          </p>
          
          {status === 'success' && (
            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                Redirecting to login page...
              </p>
              <Button 
                onClick={() => navigate('/login')}
                className="w-full"
              >
                Go to Login
              </Button>
            </div>
          )}
          
          {status === 'error' && (
            <div className="text-center space-y-2">
              <Button 
                onClick={() => navigate('/login')}
                variant="outline"
                className="w-full"
              >
                Go to Login
              </Button>
              
              <div className="text-sm text-muted-foreground">
                Need help?{' '}
                <Link 
                  to="/contact-support" 
                  className="text-primary hover:underline"
                >
                  Contact Support
                </Link>
              </div>
            </div>
          )}
          
          {status === 'verifying' && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Please wait...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailVerification; 
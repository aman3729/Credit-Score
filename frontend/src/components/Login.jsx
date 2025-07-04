import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter
} from './ui/card';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import EnhancedRegister from './EnhancedRegister';

const useSimpleToast = () => {
  try {
    const { toast } = require('../hooks/use-toast');
    return {
      toast: (options) => toast(options)
    };
  } catch (e) {
    return {
      toast: ({ title, description, variant = 'default' }) => {
        console.log(`[${variant.toUpperCase()}] ${title}: ${description}`);
      }
    };
  }
};

const Login = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useSimpleToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Validation
    const trimmedIdentifier = identifier.trim();
    const trimmedPassword = password.trim();

    if (!trimmedIdentifier || !trimmedPassword) {
      setError('Please enter both email/phone and password');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const user = await login(trimmedIdentifier, trimmedPassword);
      
      if (user.status && user.status !== 'active') {
        setError('Your account is pending activation. Please visit your nearest branch with your ID.');
        toast({
          title: 'Account Pending Activation',
          description: 'Please visit your nearest branch with your ID.',
          variant: 'warning',
        });
        return;
      }
      
      toast({
        title: 'Login Successful',
        description: 'You have been successfully logged in!',
        variant: 'success',
      });
      
      // Redirect based on user role
      if (user.role === 'lender') {
        navigate('/lender');
      } else if (user.role === 'admin') {
        navigate('/admin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);

      let errorMessage = 'Failed to log in. Please try again.';
      
      if (err.response) {
        const res = err.response;
        errorMessage =
          res.data?.message ||
          res.data?.error ||
          (res.status === 401 && res.data?.error?.toLowerCase().includes('not active')
            ? 'Your account is pending activation. Please visit your nearest branch with your ID.'
            : res.status === 401 
              ? 'Invalid email or password'
              : res.status === 403 
                ? 'Please verify your email before logging in'
                : res.status === 429 
                  ? 'Too many attempts. Please try again later'
                  : 'An unexpected error occurred');
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection';
      } else if (err.message?.includes('Network Error')) {
        errorMessage = 'Network error: Could not reach the server';
      }

      setError(errorMessage);
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSuccess = (data) => {
    setActiveTab('login');
    toast({
      title: 'Registration Successful',
      description: 'Please check your email to verify your account.',
      variant: 'success',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl overflow-hidden border-0 dark:border dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-gray-800 dark:to-gray-900 text-white p-8">
          <div className="text-center">
            <div className="mx-auto bg-white dark:bg-gray-700 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
            </div>
            <CardTitle className="text-2xl font-bold">
              {activeTab === 'login' ? 'Welcome Back' : 'Create Account'}
            </CardTitle>
            <CardDescription className="text-blue-100 dark:text-gray-300 mt-2">
              {activeTab === 'login' 
                ? 'Sign in to access your account' 
                : 'Create a new account to get started'}
            </CardDescription>
          </div>
        </CardHeader>

        {/* Tab Navigation */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'login'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
              activeTab === 'register'
                ? 'text-blue-600 border-b-2 border-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Data Accuracy Notice for Registration */}
        {activeTab === 'register' && (
          <div className="p-4 bg-amber-50 border-b border-amber-200">
            <div className="flex items-start space-x-2">
              <svg className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-amber-700">
                <strong>Important:</strong> Financial data accuracy directly affects your credit score. 
                Please provide current and accurate information.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'login' ? (
          <form onSubmit={handleSubmit}>
            <CardContent className="p-6 space-y-6">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-md text-sm border border-red-200 dark:border-red-800 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3">
                <Label htmlFor="identifier">Email or Phone Number</Label>
                <Input
                  id="identifier"
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  placeholder="Enter your email or phone number"
                  autoComplete="username"
                  disabled={loading}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-gray-700 dark:text-gray-300">Password</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="pl-10 py-3 pr-10"
                    autoComplete="current-password"
                  />
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <Button type="submit" disabled={loading} className="w-full mt-4">
                {loading ? <Loader2 className="animate-spin" /> : "Sign In"}
              </Button>
            </CardContent>

            <CardFooter className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center w-full space-y-3">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('register')}
                    className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    Create account
                  </button>
                </p>
                
                {/* Quick info about account types */}
                <div className="text-xs text-gray-500 dark:text-gray-500 space-y-1">
                  <p>• <strong>Borrowers:</strong> Check your credit score and get insights</p>
                  <p>• <strong>Premium Users:</strong> Advanced monitoring and simulation tools</p>
                  <p>• <strong>Lenders:</strong> Access to applicant scoring tools</p>
                </div>
                
                {/* Demo account info for development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      <strong>Demo:</strong> admin@creditdashboard.com / admin123
                    </p>
                  </div>
                )}
              </div>
            </CardFooter>
          </form>
        ) : (
          <CardContent className="p-0">
            <EnhancedRegister
              isAdmin={false}
              onSuccess={handleRegisterSuccess}
              onClose={() => setActiveTab('login')}
              showPendingMessage={true}
            />
            <CardFooter className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
              <div className="text-center w-full">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('login')}
                    className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
                  >
                    Sign in
                  </button>
                </p>
              </div>
            </CardFooter>
          </CardContent>
        )}
      </Card>
    </div>
  );
};

export default Login;
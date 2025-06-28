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
  const [email, setEmail] = useState('');
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
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter both email and password');
      return;
    }

    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setError('Please enter a valid email address');
      return;
    }

    if (trimmedPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      await login(trimmedEmail, trimmedPassword);

      toast({
        title: 'Login Successful',
        description: 'You have been successfully logged in!',
        variant: 'success',
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);

      let errorMessage = 'Failed to log in. Please try again.';
      
      if (err.response) {
        const res = err.response;
        errorMessage =
          res.data?.message ||
          res.data?.error ||
          (res.status === 401 ? 'Invalid email or password' :
           res.status === 403 ? 'Please verify your email before logging in' :
           res.status === 429 ? 'Too many attempts. Please try again later' :
           'An unexpected error occurred');
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

  const handleDemoLogin = async () => {
    setEmail('demo@example.com');
    setPassword('demoPassword123');
    
    try {
      setLoading(true);
      await login('demo@example.com', 'demoPassword123');

      toast({
        title: 'Demo Login Successful',
        description: 'You are now logged in with a demo account',
        variant: 'success',
      });

      navigate('/dashboard');
    } catch (err) {
      setError('Failed to login with demo account. Please try again.');
      toast({
        title: 'Demo Login Failed',
        description: 'Could not authenticate with demo credentials',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl overflow-hidden border-0 dark:border dark:border-gray-700">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-700 dark:from-gray-800 dark:to-gray-900 text-white p-8">
          <div className="text-center">
            <div className="mx-auto bg-white dark:bg-gray-700 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
              <div className="bg-gray-200 border-2 border-dashed rounded-xl w-16 h-16" />
            </div>
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription className="text-blue-100 dark:text-gray-300 mt-2">
              Sign in to access your account
            </CardDescription>
          </div>
        </CardHeader>

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
              <Label htmlFor="email" className="text-gray-700 dark:text-gray-300">Email Address</Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="pl-10 py-3"
                  autoComplete="email"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                </div>
              </div>
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

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 py-3 rounded-lg font-medium transition-all"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in to your account'
              )}
            </Button>

            <div className="relative mt-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                  Or continue with
                </span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full py-3 rounded-lg font-medium mt-4"
              onClick={handleDemoLogin}
              disabled={loading}
            >
              Use Demo Account
            </Button>
          </CardContent>

          <CardFooter className="p-6 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700">
            <p className="text-center text-sm text-gray-600 dark:text-gray-400 w-full">
              Don't have an account?{' '}
              <Link
                to="/register"
                className="font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
              >
                Create account
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Login;
import React, { useState, useEffect, useRef } from 'react';
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
import { Fragment, useState as useReactState } from 'react';
import StarryBackground from './StarryBackground';

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
  const isMountedRef = useRef(true);
  const [showForgotModal, setShowForgotModal] = useReactState(false);
  const [forgotEmail, setForgotEmail] = useReactState("");
  const [forgotError, setForgotError] = useReactState("");
  const [forgotSuccess, setForgotSuccess] = useReactState("");
  const [forgotLoading, setForgotLoading] = useReactState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useReactState(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

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
      
      if (!user) {
        setError('Login failed. Please try again.');
        return;
      }
      
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
      if (!isMountedRef.current) return;
      
      console.error('Login error:', err);

      let errorMessage = 'Failed to log in. Please try again.';
      
      if (err.response && err.response.status) {
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
      } else {
        errorMessage = err.message || 'Failed to log in. Please try again.';
      }

      setError(errorMessage);
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleRegisterSuccess = (data) => {
    if (!isMountedRef.current) return;
    
    setActiveTab('login');
    toast({
      title: 'Registration Successful',
      description: 'Please check your email to verify your account.',
      variant: 'success',
    });
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    const email = forgotEmail.trim();
    if (!email.match(/^\S+@\S+\.\S+$/)) {
      setForgotError("Please enter a valid email address");
      return;
    }
    setForgotLoading(true);
    setTimeout(() => {
      setForgotLoading(false);
      setForgotSuccess("If this email is registered, a reset link has been sent.");
    }, 1200);
  };

  return (
    <>
      <StarryBackground />
      <div
        className="fixed inset-0 min-h-0 min-w-0 flex flex-col justify-between animate-fade-in-slow overflow-hidden"
        style={{ position: 'relative', zIndex: 1 }}
      >
        {/* Header */}
        <header className="w-full py-6 px-6 flex flex-col items-center">
          <div className="text-2xl font-bold text-[#1A3C5E] tracking-tight">YourAppName</div>
          <h1 className="mt-4 text-3xl font-bold text-[#1A3C5E] text-center">Welcome</h1>
          <p className="mt-2 text-lg text-[#6C757D] text-center">Sign in to access your dashboard</p>
        </header>

        {/* Login Card */}
        <main className="flex-1 flex items-center justify-center">
          <Card className="w-full max-w-md shadow-lg rounded-lg p-8 flex flex-col items-center border-0 animate-fade-in">
            {/* Tab Navigation */}
            <div className="flex w-full mb-6">
              <Link
                to="/login"
                className={`flex-1 py-3 px-4 text-lg font-semibold transition-colors rounded-t-lg border-b-2 focus:outline-none text-center ${
                  window.location.pathname === '/login'
                    ? 'text-[#1A3C5E] border-[#17A2B8] bg-[#F8F9FA]'
                    : 'text-[#6C757D] border-transparent hover:text-[#1A3C5E] bg-transparent'
                }`}
                aria-selected={window.location.pathname === '/login'}
                role="tab"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className={`flex-1 py-3 px-4 text-lg font-semibold transition-colors rounded-t-lg border-b-2 focus:outline-none text-center ${
                  window.location.pathname === '/register'
                    ? 'text-[#1A3C5E] border-[#17A2B8] bg-[#F8F9FA]'
                    : 'text-[#6C757D] border-transparent hover:text-[#1A3C5E] bg-transparent'
                }`}
                aria-selected={window.location.pathname === '/register'}
                role="tab"
              >
                Create Account
              </Link>
            </div>
            {/* The rest of the form fields and logic remain unchanged for now */}
            {activeTab === 'login' ? (
              <form onSubmit={handleSubmit} className="w-full">
                <CardContent className="p-0 space-y-6">
                  {/* Email/Username Input */}
                  <div>
                    <Label htmlFor="identifier" className="block text-[#1A3C5E] text-lg font-bold mb-1">Email or Username</Label>
                    <Input
                      id="identifier"
                      type="text"
                      value={identifier}
                      onChange={e => setIdentifier(e.target.value)}
                      placeholder="Enter your email or username"
                      className="w-full border border-[#CED4DA] rounded-lg px-4 py-3 text-base text-[#6C757D] focus:border-[#17A2B8] focus:ring-2 focus:ring-[#17A2B8] transition-colors"
                      aria-label="Email or Username input"
                      autoComplete="username"
                    />
                  </div>
                  {/* Password Input */}
                  <div className="relative">
                    <Label htmlFor="password" className="block text-[#1A3C5E] text-lg font-bold mb-1">Password</Label>
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full border border-[#CED4DA] rounded-lg px-4 py-3 text-base text-[#6C757D] focus:border-[#17A2B8] focus:ring-2 focus:ring-[#17A2B8] transition-colors pr-12"
                      aria-label="Password input"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      className="absolute right-3 top-9 transform -translate-y-1/2 text-[#6C757D] hover:text-[#17A2B8] focus:outline-none"
                      onClick={() => setShowPassword(v => !v)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between mt-2">
                    <label className="flex items-center text-[#6C757D] text-base">
                      <input
                        type="checkbox"
                        className="form-checkbox h-5 w-5 text-[#17A2B8] rounded border-[#CED4DA] focus:ring-[#17A2B8] mr-2"
                        // TODO: wire up remember me logic if needed
                      />
                      Remember me
                    </label>
                    <button
                      type="button"
                      className="text-[#17A2B8] text-sm hover:underline focus:outline-none"
                      onClick={() => setShowForgotModal(true)}
                    >
                      Forgot Password?
                    </button>
                  </div>
                  {/* Error/Success Message */}
                  {error && (
                    <div className="text-[#DC3545] text-sm italic mt-2 animate-slide-in-top" role="alert">
                      {error}
                    </div>
                  )}
                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-full bg-[#17A2B8] hover:bg-[#138496] text-white text-lg font-bold rounded-lg py-3 mt-2 transition-colors disabled:bg-[#6C757D] flex items-center justify-center"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-2" size={24} /> Signing In…
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </CardContent>
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

          {/* Alternative Login Options */}
          {activeTab === 'login' && (
            <div className="w-full max-w-md mx-auto mt-6 flex flex-col items-center">
              <div className="flex items-center w-full mb-4">
                <div className="flex-grow border-t border-[#CED4DA]" />
                <span className="mx-4 text-[#6C757D] text-base">Or sign in with</span>
                <div className="flex-grow border-t border-[#CED4DA]" />
              </div>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-[#1A3C5E] hover:bg-[#142A44] text-white font-semibold rounded-lg py-3 mb-3 transition-colors transform hover:scale-105 duration-200"
                onClick={() => alert('Google login (mock)')}
              >
                {/* Google SVG */}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_17_40)">
                    <path d="M23.766 12.276c0-.818-.074-1.604-.213-2.356H12.24v4.451h6.484a5.54 5.54 0 01-2.4 3.637v3.017h3.877c2.27-2.092 3.565-5.175 3.565-8.749z" fill="#4285F4"/>
                    <path d="M12.24 24c3.24 0 5.963-1.073 7.95-2.917l-3.877-3.017c-1.08.726-2.457 1.155-4.073 1.155-3.13 0-5.78-2.113-6.734-4.946H1.53v3.09A11.997 11.997 0 0012.24 24z" fill="#34A853"/>
                    <path d="M5.506 14.275a7.19 7.19 0 010-4.55V6.635H1.53a12.002 12.002 0 000 10.73l3.976-3.09z" fill="#FBBC05"/>
                    <path d="M12.24 4.771c1.765 0 3.34.607 4.584 1.8l3.433-3.433C18.2 1.073 15.477 0 12.24 0A11.997 11.997 0 001.53 6.635l3.976 3.09c.954-2.833 3.604-4.954 6.734-4.954z" fill="#EA4335"/>
                  </g>
                  <defs>
                    <clipPath id="clip0_17_40">
                      <rect width="24" height="24" fill="white"/>
                    </clipPath>
                  </defs>
                </svg>
                Sign in with Google
              </button>
              <button
                type="button"
                className="w-full flex items-center justify-center gap-3 bg-[#1A3C5E] hover:bg-[#142A44] text-white font-semibold rounded-lg py-3 transition-colors"
                onClick={() => alert('SSO login (mock)')}
              >
                {/* Lock Icon */}
                <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-lock" viewBox="0 0 24 24"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Sign in with SSO
              </button>
            </div>
          )}
          </Card>
        </main>

        {/* Footer */}
        <footer className="w-full py-4 px-6 flex flex-col items-center text-sm text-[#6C757D] bg-transparent mt-8">
          <div className="flex flex-col md:flex-row gap-2 md:gap-6 items-center w-full md:w-auto text-center">
            {/* Remove Create Account link from footer */}
            <span className="hover:underline cursor-pointer" onClick={() => setShowPrivacyModal(true)}>Privacy Policy</span>
          </div>
          <div className="mt-2">Need help? <a href="mailto:support@yourapp.com" className="underline">Contact Support</a></div>
        </footer>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in">
            <div
              className="bg-white rounded-lg shadow-xl w-[90%] max-w-sm p-6 relative animate-fade-in"
              role="dialog"
              aria-modal="true"
              aria-labelledby="forgot-title"
              tabIndex={-1}
              ref={el => el && showForgotModal && el.focus()}
            >
              <h2 id="forgot-title" className="text-xl font-bold text-[#1A3C5E] mb-2 text-center">Reset Password</h2>
              <p className="text-[#6C757D] text-sm mb-4 text-center">Enter your email to receive a reset link.</p>
              <form onSubmit={handleForgotSubmit}>
                <input
                  type="email"
                  className="w-full border border-[#CED4DA] rounded-lg px-4 py-3 text-base text-[#6C757D] focus:border-[#17A2B8] focus:ring-2 focus:ring-[#17A2B8] transition-colors mb-2"
                  placeholder="Enter your email"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  aria-label="Forgot password email input"
                  autoFocus
                  required
                />
                {forgotError && (
                  <div className="text-[#DC3545] text-sm italic mb-2 animate-fade-in" role="alert">{forgotError}</div>
                )}
                {forgotSuccess && (
                  <div className="text-[#28A745] text-sm italic mb-2 animate-fade-in" role="status">{forgotSuccess}</div>
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-[#17A2B8] hover:bg-[#138496] text-white font-bold rounded-lg py-2 transition-colors disabled:bg-[#6C757D]"
                    disabled={forgotLoading}
                  >
                    {forgotLoading ? <Loader2 className="animate-spin inline-block mr-2" size={20} /> : null}
                    Send Reset Link
                  </button>
                  <button
                    type="button"
                    className="flex-1 bg-[#CED4DA] hover:bg-[#B0B8BE] text-[#1A3C5E] font-bold rounded-lg py-2 transition-colors"
                    onClick={() => {
                      setShowForgotModal(false);
                      setForgotEmail("");
                      setForgotError("");
                      setForgotSuccess("");
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        {/* Privacy Policy Modal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40 animate-fade-in">
            <div
              className="bg-white rounded-lg shadow-xl w-[90%] max-w-lg p-6 relative animate-fade-in max-h-[80vh] overflow-y-auto"
              role="dialog"
              aria-modal="true"
              aria-labelledby="privacy-title"
              tabIndex={-1}
              ref={el => el && showPrivacyModal && el.focus()}
            >
              <h2 id="privacy-title" className="text-xl font-bold text-[#1A3C5E] mb-2 text-center">Privacy Policy</h2>
              <div className="text-[#6C757D] text-sm mb-4 whitespace-pre-line">
                <p>
                  This is a placeholder for your Privacy Policy. 
                  
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nunc ut laoreet dictum, massa erat cursus enim, nec dictum ex enim nec urna. Etiam euismod, urna eu tincidunt consectetur, nisi nisl aliquam nunc, eget aliquam nisl nunc euismod nunc. 
                  
                  Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; Integer nec odio. Praesent libero. Sed cursus ante dapibus diam. 
                  
                  For more information, contact support@yourapp.com.
                </p>
              </div>
              <button
                type="button"
                className="w-full bg-[#17A2B8] hover:bg-[#138496] text-white font-bold rounded-lg py-2 transition-colors mt-2"
                onClick={() => setShowPrivacyModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;
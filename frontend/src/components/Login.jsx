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
import { Eye, EyeOff, Loader2, User, Lock, AlertCircle, Mail, CheckCircle2 } from 'lucide-react';
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

const Login = ({ onLogin }) => {
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
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetPasswordConfirm, setResetPasswordConfirm] = useState("");

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    console.log('[Login] Form submitted with:', { identifier: identifier.trim(), password: '[HIDDEN]' });
    
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
      console.log('[Login] Setting loading state to true');
      setLoading(true);
      
      console.log('[Login] Calling login function with:', { identifier: trimmedIdentifier, password: '[HIDDEN]' });
      const user = await login(trimmedIdentifier, trimmedPassword);
      
      console.log('[Login] Login response received:', user);
      
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
      
      console.error('[Login] Login error:', err);

      let errorMessage = 'Failed to log in. Please try again.';
      
      if (err.response && err.response.status) {
        const res = err.response;
        console.log('[Login] Error response:', { status: res.status, data: res.data });
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
        console.log('[Login] No response received:', err.request);
        errorMessage = 'No response from server. Please check your connection';
      } else if (err.message?.includes('Network Error')) {
        console.log('[Login] Network error:', err.message);
        errorMessage = 'Network error: Could not reach the server';
      } else if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        console.log('[Login] Request timeout:', err.message);
        errorMessage = 'Request timed out. Please try again';
      } else {
        console.log('[Login] Other error:', err.message);
        errorMessage = err.message || 'Failed to log in. Please try again.';
      }

      setError(errorMessage);
      toast({
        title: 'Login Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      // Always reset loading state, even if component is unmounted
      console.log('[Login] Finally block - resetting loading state');
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
    try {
      const res = await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotSuccess("A reset code has been sent to your email.");
        setForgotStep(2);
      } else {
        setForgotError(data.message || "Failed to send reset code.");
      }
    } catch (err) {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    if (!resetCode.match(/^\d{6}$/)) {
      setForgotError("Please enter the 6-digit code sent to your email.");
      return;
    }
    if (!resetPassword || resetPassword.length < 8) {
      setForgotError("Password must be at least 8 characters.");
      return;
    }
    if (resetPassword !== resetPasswordConfirm) {
      setForgotError("Passwords do not match.");
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/v1/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail.trim(),
          code: resetCode,
          password: resetPassword,
          passwordConfirm: resetPasswordConfirm
        })
      });
      const data = await res.json();
      if (res.ok) {
        setForgotSuccess("Password has been reset. You can now log in.");
        setTimeout(() => {
          setShowForgotModal(false);
          setForgotEmail("");
          setResetCode("");
          setResetPassword("");
          setResetPasswordConfirm("");
          setForgotStep(1);
          setForgotSuccess("");
        }, 2000);
      } else {
        setForgotError(data.message || "Failed to reset password.");
      }
    } catch (err) {
      setForgotError("Network error. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const StarryBackground = () => (
    <div className="fixed inset-0 bg-black z-0">
      {[...Array(50)].map((_, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-white animate-pulse"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            width: `${Math.random() * 3}px`,
            height: `${Math.random() * 3}px`,
            opacity: Math.random() * 0.7 + 0.3,
            animationDuration: `${Math.random() * 5 + 2}s`,
          }}
        />
      ))}
    </div>
  );

  return (
    <>
      <StarryBackground />
      <div className="min-h-screen flex flex-col relative z-10">
        {/* Header */}
        <header className="w-full pt-8 pb-6 px-6 text-center animate-fade-in">
          <div className="max-w-md mx-auto">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-2">
              myMVO
            </h1>
            <p className="text-lg text-muted-foreground">
              Welcome back! Please sign in to continue
            </p>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex items-center justify-center px-6 py-8">
          <div className="w-full max-w-md space-y-6">
            {/* Glass Card */}
            <Card className="border-0 shadow-xl backdrop-blur-lg bg-background/80 animate-slide-up">
              <CardHeader className="space-y-1 pb-6">
                {/* Tab Navigation */}
                <div className="flex p-1 space-x-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setActiveTab('login')}
                    className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200 ${
                      activeTab === 'login'
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => navigate('/register')}
                    className={`flex-1 py-2.5 px-4 text-sm font-medium rounded-md transition-all duration-200 text-muted-foreground hover:text-foreground`}
                  >
                    Create Account
                  </button>
                </div>

                <CardTitle className="text-2xl font-bold text-center">
                  Sign In
                </CardTitle>
                <CardDescription className="text-center">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email/Username Input */}
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-sm font-medium">
                      Email or Username
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="identifier"
                        type="text"
                        value={identifier}
                        onChange={e => setIdentifier(e.target.value)}
                        placeholder="Enter your email or username"
                        className="pl-10 h-12 bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all duration-200"
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium">
                      Password
                    </Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="pl-10 pr-10 h-12 bg-background/50 border-border/50 focus:bg-background focus:border-primary transition-all duration-200"
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="flex items-center justify-between">
                    <label className="flex items-center space-x-2 text-sm">
                      <input
                        type="checkbox"
                        className="rounded border-border text-primary focus:ring-primary focus:ring-offset-0"
                      />
                      <span className="text-muted-foreground">Remember me</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>

                  {/* Error Message */}
                  {error && (
                    <div className="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm animate-scale-in">
                      <AlertCircle className="h-4 w-4 flex-shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  {/* Login Button */}
                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="animate-spin mr-2 h-4 w-4" />
                        Signing In...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>

                  {/* Divider */}
                  <div className="relative my-6">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border/50" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">or continue with</span>
                    </div>
                  </div>

                  {/* Social Login Buttons */}
                  <div className="space-y-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => alert('Google login (mock)')}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
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
                      Continue with Google
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      size="lg"
                      className="w-full"
                      onClick={() => alert('SSO login (mock)')}
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Continue with SSO
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>

        {/* Footer */}
        <footer className="w-full py-6 px-6 text-center text-sm text-muted-foreground">
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex justify-center space-x-6">
              <button
                onClick={() => setShowPrivacyModal(true)}
                className="hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              <a 
                href="mailto:support@yourapp.com" 
                className="hover:text-foreground transition-colors"
              >
                Support
              </a>
            </div>
            <p>© 2024 myMVO. All rights reserved.</p>
          </div>
        </footer>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
            <Card className="w-[90%] max-w-md shadow-xl animate-scale-in">
              <CardHeader>
                <CardTitle className="text-center">Reset Password</CardTitle>
                <CardDescription className="text-center">
                  {forgotStep === 1 
                    ? "Enter your email to receive a reset code"
                    : "Enter the code and your new password"
                  }
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                {forgotStep === 1 ? (
                  <form onSubmit={handleForgotSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgot-email">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="forgot-email"
                          type="email"
                          value={forgotEmail}
                          onChange={e => setForgotEmail(e.target.value)}
                          placeholder="Enter your email"
                          className="pl-10"
                          autoFocus
                          required
                        />
                      </div>
                    </div>
                    
                    {forgotError && (
                      <div className="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    
                    {forgotSuccess && (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        <span>{forgotSuccess}</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                        disabled={forgotLoading}
                      >
                        {forgotLoading ? (
                          <>
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            Sending...
                          </>
                        ) : (
                          'Send Code'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowForgotModal(false);
                          setForgotEmail("");
                          setForgotError("");
                          setForgotSuccess("");
                          setForgotStep(1);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleResetSubmit} className="space-y-4">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="reset-code">6-Digit Code</Label>
                        <Input
                          id="reset-code"
                          type="text"
                          value={resetCode}
                          onChange={e => setResetCode(e.target.value)}
                          placeholder="Enter 6-digit code"
                          maxLength={6}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={resetPassword}
                          onChange={e => setResetPassword(e.target.value)}
                          placeholder="Enter new password"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={resetPasswordConfirm}
                          onChange={e => setResetPasswordConfirm(e.target.value)}
                          placeholder="Confirm new password"
                          required
                        />
                      </div>
                    </div>
                    
                    {forgotError && (
                      <div className="flex items-center space-x-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{forgotError}</span>
                      </div>
                    )}
                    
                    {forgotSuccess && (
                      <div className="flex items-center space-x-2 p-3 bg-green-50 text-green-600 rounded-lg text-sm">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        <span>{forgotSuccess}</span>
                      </div>
                    )}
                    
                    <div className="flex space-x-2">
                      <Button
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white"
                        disabled={forgotLoading}
                      >
                        {forgotLoading ? (
                          <>
                            <Loader2 className="animate-spin mr-2 h-4 w-4" />
                            Resetting...
                          </>
                        ) : (
                          'Reset Password'
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setShowForgotModal(false);
                          setForgotEmail("");
                          setForgotError("");
                          setForgotSuccess("");
                          setForgotStep(1);
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Privacy Policy Modal */}
        {showPrivacyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-fade-in">
            <Card className="w-[90%] max-w-2xl max-h-[80vh] overflow-hidden shadow-xl animate-scale-in">
              <CardHeader>
                <CardTitle className="text-center">Privacy Policy</CardTitle>
              </CardHeader>
              
              <CardContent className="overflow-y-auto">
                <div className="prose prose-sm max-w-none text-muted-foreground">
                  <p className="mb-4">
                    This is a placeholder for your Privacy Policy.
                  </p>
                  
                  <p className="mb-4">
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, nunc ut laoreet dictum, 
                    massa erat cursus enim, nec dictum ex enim nec urna. Etiam euismod, urna eu tincidunt consectetur, 
                    nisi nisl aliquam nunc, eget aliquam nisl nunc euismod nunc.
                  </p>
                  
                  <p className="mb-4">
                    Pellentesque habitant morbi tristique senectus et netus et malesuada fames ac turpis egestas. 
                    Vestibulum ante ipsum primis in faucibus orci luctus et ultrices posuere cubilia curae; 
                    Integer nec odio. Praesent libero. Sed cursus ante dapibus diam.
                  </p>
                  
                  <p>
                    For more information, contact{' '}
                    <a href="mailto:support@yourapp.com" className="text-primary hover:underline">
                      support@yourapp.com
                    </a>
                  </p>
                </div>
              </CardContent>
              
              <CardFooter>
                <Button
                  onClick={() => setShowPrivacyModal(false)}
                  className="w-full"
                >
                  Close
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
    </>
  );
};

export default Login;
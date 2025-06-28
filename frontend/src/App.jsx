import React, { useCallback, useEffect, useState, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
// Update Dashboard import
import { Dashboard } from './components/Dashboard';
import Navigation from './components/Navigation';
import Login from './components/Login';
import Register from './components/Register';
import AdminDashboard from './components/AdminDashboard';
import EmailVerification from './components/EmailVerification';
import LenderDashboard from './components/LenderDashboard';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import { Button } from './components/ui/button';

// Protected route component with enhanced role-based access control
const ProtectedRoute = ({ user, requiredRole, children }) => {
  const location = useLocation();
  const { toast } = useToast();
  const [hasShownToast, setHasShownToast] = React.useState(false);
  const navigate = useNavigate();

  // Debug logging
  console.log('=== PROTECTED ROUTE DEBUG ===');
  console.log('User object:', JSON.stringify(user, null, 2));
  console.log('Required role(s):', requiredRole);
  console.log('Current path:', location.pathname);
  console.log('Has user:', !!user);
  if (user) {
    console.log('User role:', user.role);
    console.log('User ID:', user.id);
    console.log('User email:', user.email);
    console.log('User properties:', Object.keys(user).join(', '));
  }

  // Check if user has any of the required roles
  const hasRequiredRole = React.useMemo(() => {
    console.log('=== CHECKING ROLES ===');
    console.log('Required role(s):', requiredRole);
    console.log('User role:', user?.role);
    
    // If no role is required, allow access
    if (!requiredRole) {
      console.log('No role required, allowing access');
      return true;
    }
    
    const userRole = user?.role || 'user';
    const isAdmin = userRole === 'admin';
    
    // If user is admin, always allow access
    if (isAdmin) {
      console.log('User is admin, allowing access');
      return true;
    }
    
    // Handle both string and array of roles
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const hasRole = requiredRoles.includes(userRole);
    
    console.log('User has required role?', hasRole, { userRole, requiredRoles });
    return hasRole;
  }, [user, requiredRole]);

  // Show toast only once when access is denied
  React.useEffect(() => {
    if (!user) return;
    
    if (!hasRequiredRole && !hasShownToast) {
      console.warn(`Access denied: User role '${user?.role}' doesn't have access to this route`);
      
      toast({
        title: 'Access Denied',
        description: `You don't have permission to access this page. Required role: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`,
        variant: 'destructive',
      });
      
      setHasShownToast(true);
      
      // Redirect to a safe route if not already there
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard', { replace: true });
      }
    }
  }, [user, requiredRole, hasRequiredRole, hasShownToast, toast, location.pathname, navigate]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  
  // If user doesn't have required role, show nothing (redirect will happen in useEffect)
  if (!hasRequiredRole) {
    return null;
  }

  // If we have children, render them, otherwise render the Outlet
  return children || <Outlet />;
};

console.log('App: Rendering App component');

const App = () => {
  console.log('App: Initializing component');
  
  const { user, loading, login, logout, register } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const auth = !!user; // Convert user to boolean for auth check
  
  // Debug: Log current auth state
  useEffect(() => {
    console.log('App: Auth state updated', { 
      user, 
      loading, 
      auth, 
      pathname: location.pathname 
    });
  }, [user, loading, auth, location.pathname]);
  
  // Debug: Log when the component mounts and unmounts
  useEffect(() => {
    console.log('App: Component mounted');
    return () => console.log('App: Component unmounting');
  }, []);
  
  // Debug: Log current path
  console.log('App: Current path:', window.location.pathname);
  console.log('App: User:', user);
  console.log('App: Loading:', loading);
  
  console.log('App: Current auth state', { 
    user, 
    loading, 
    auth, 
    pathname: window.location.pathname 
  });

  // Initialize dark mode from localStorage or system preference
  useEffect(() => {
    const isDark = localStorage.getItem('darkMode') === 'true' || 
                  (!('darkMode' in localStorage) && 
                   window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    setDarkMode(isDark);
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', newDarkMode);
    if (newDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  // Handle login
  const handleLogin = useCallback(async (credentials) => {
    try {
      await login(credentials);
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Login Failed',
        description: error.message || 'Failed to log in. Please try again.',
        variant: 'destructive',
      });
    }
  }, [login, navigate, toast]);

  // Handle register (kept for backward compatibility)
  const handleRegister = useCallback(async (userData) => {
    try {
      await register(userData);
      toast({
        title: 'Registration Successful',
        description: 'Please check your email to verify your account.',
      });
      navigate('/login');
    } catch (error) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Failed to register. Please try again.',
        variant: 'destructive',
      });
      throw error; // Re-throw to let the form handle the error
    }
  }, [register, navigate, toast]);

  // Handle logout
  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  // Debug: Log user info
  useEffect(() => {
    if (user) {
      console.log('Current user:', {
        id: user.id,
        email: user.email,
        role: user.role,
        hasAdminAccess: user.role === 'admin'
      });
    }
  }, [user]);

  if (loading) {
    console.log('App: Showing loading state');
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
          <p className="text-sm text-gray-500 mt-2">Checking authentication status...</p>
        </div>
      </div>
    );
  }


  console.log('App: Rendering main content');
  
  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading application...</p>
          <p className="text-sm text-gray-500 mt-2">Checking authentication status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      <div id="app-root" style={{ display: 'none' }}>App Root Element</div>
      <Toaster />
      
      {/* Navigation - Only show when user is authenticated */}
      {auth && (
        <Navigation 
          darkMode={darkMode} 
          toggleDarkMode={toggleDarkMode}
          onLogout={handleLogout}
          userRole={user?.role}
        />
      )}
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <Suspense fallback={
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        }>
          <Routes>
            {/* Public routes */}
            <Route 
              path="/login" 
              element={
                !auth ? (
                  <Login onLogin={handleLogin} />
                ) : (
                  <Navigate to="/dashboard" state={{ from: location }} replace />
                )
              } 
            />
            
            <Route 
              path="/register" 
              element={
                !auth ? (
                  <Register onRegister={handleRegister} />
                ) : (
                  <Navigate to="/dashboard" state={{ from: location }} replace />
                )
              } 
            />
            
            <Route 
              path="/verify-email/:token" 
              element={
                !auth ? (
                  <EmailVerification />
                ) : (
                  <Navigate to="/dashboard" state={{ from: location }} replace />
                )
              } 
            />

            {/* Protected routes */}
            <Route element={<ProtectedRoute user={user} />}>
              <Route 
                path="/dashboard" 
                element={
                  <Dashboard 
                    onLogout={handleLogout}
                    user={user}
                  />
                } 
              />
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute user={user} requiredRole="admin" />}>
              <Route path="/admin/*" element={<AdminDashboard />} />
            </Route>

            {/* Lender routes - accessible to both lender and admin roles */}
            <Route 
              path="/lender" 
              element={
                <ProtectedRoute user={user} requiredRole={['lender', 'admin']}>
                  <LenderDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/lender/:userId" 
              element={
                <ProtectedRoute user={user} requiredRole={['lender', 'admin']}>
                  <LenderDashboard />
                </ProtectedRoute>
              } 
            />

            {/* Redirects */}
            <Route 
              path="/" 
              element={
                <Navigate 
                  to={auth ? "/dashboard" : "/login"} 
                  state={{ from: location }} 
                  replace 
                />
              } 
            />
            
            {/* Test route - Remove this in production */}
            <Route 
              path="/test-admin" 
              element={
                <div className="p-8">
                  <h1 className="text-2xl font-bold mb-4">Test Admin Route</h1>
                  <p>This is a test route to verify basic routing is working.</p>
                  <p className="mt-4">
                    <button 
                      onClick={() => window.history.back()}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Go Back
                    </button>
                  </p>
                </div>
              } 
            />
            
            {/* 404 - Not Found */}
            <Route 
              path="*" 
              element={
                <div className="min-h-screen flex items-center justify-center">
                  <div className="text-center">
                    <h1 className="text-4xl font-bold text-gray-800 dark:text-white mb-4">404</h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">Page not found</p>
                    <Button 
                      variant="outline" 
                      onClick={() => navigate(auth ? '/dashboard' : '/login')}
                      className="px-6 py-2"
                    >
                      Go to {auth ? 'Dashboard' : 'Login'}
                    </Button>
                  </div>
                </div>
              } 
            />
          </Routes>
        </Suspense>
      </main>
      
      {/* Footer - Only show when user is authenticated */}
      {auth && (
        <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 py-4">
          <div className="container mx-auto px-4 text-center text-gray-600 dark:text-gray-400">
            <p>© {new Date().getFullYear()} Credit Score Dashboard. All rights reserved.</p>
            <p className="text-sm mt-1">Logged in as: {user?.email} ({user?.role || 'user'})</p>
          </div>
        </footer>
      )}
    </div>
  );
};

// No need for AppWrapper anymore since Router is in main.jsx
export default App;
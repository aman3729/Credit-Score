import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import { useToast } from './hooks/use-toast';
import { Toaster } from './components/ui/toaster';
import { Button } from './components/ui/button';
import ErrorBoundary from './components/ErrorBoundary';
import LoadingSpinner from './components/common/LoadingSpinner';
import ProtectedRoute from './components/auth/ProtectedRoute';
import AppLayout from './components/layout/AppLayout';

// Lazy load components for better performance
// Using existing component paths until we move them to new structure
const Login = lazy(() => import('./components/Login'));
const Register = lazy(() => import('./components/RegisterPage'));
const EmailVerification = lazy(() => import('./components/EmailVerification'));
const Dashboard = lazy(() => import('./components/Dashboard'));
const PremiumDashboard = lazy(() => import('./components/PremiumDashboard'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const LenderDashboard = lazy(() => import('./components/LenderDashboard'));
const AdminUserDetails = lazy(() => import('./components/AdminUserDetails'));

/**
 * Main App component with clean routing and error handling
 */
const App = () => {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { toast } = useToast();

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-background">
        <Toaster />
        
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* Public Routes */}
            <Route 
              path="/login" 
              element={
                !user ? (
                  <Login />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            
            <Route 
              path="/register" 
              element={
                !user ? (
                  <Register />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />
            
            <Route 
              path="/verify-email/:token" 
              element={
                !user ? (
                  <EmailVerification />
                ) : (
                  <Navigate to="/dashboard" replace />
                )
              } 
            />

            {/* Protected Routes with Layout */}
            <Route element={<ProtectedRoute user={user} />}>
              <Route element={<AppLayout />}>
                {/* Main Dashboard */}
                <Route path="/dashboard" element={<Dashboard />} />
                
                {/* Premium Dashboard */}
                <Route 
                  path="/premium" 
                  element={
                    <ProtectedRoute user={user} requiredRole={['premium', 'admin']}>
                      <PremiumDashboard />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Admin Routes */}
                <Route element={<ProtectedRoute user={user} requiredRole="admin" />}>
                  <Route path="/admin/*" element={<AdminDashboard />} />
                  <Route path="/admin/users/:userId" element={<AdminUserDetails />} />
                </Route>

                {/* Lender Routes */}
                <Route 
                  path="/lender/*" 
                  element={
                    <ProtectedRoute user={user} requiredRole={['lender', 'admin']}>
                      <LenderDashboard />
                    </ProtectedRoute>
                  } 
                />
              </Route>
            </Route>

            {/* Redirects */}
            <Route 
              path="/" 
              element={
                <Navigate 
                  to={user ? "/dashboard" : "/login"} 
                  replace 
                />
              } 
            />
            
            {/* 404 - Not Found */}
            <Route 
              path="*" 
              element={<NotFoundPage />}
            />
          </Routes>
        </Suspense>
      </div>
    </ErrorBoundary>
  );
};

/**
 * 404 Not Found Page
 */
const NotFoundPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-foreground mb-4">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Page not found</p>
        <Button 
          variant="outline" 
          onClick={() => navigate(user ? '/dashboard' : '/login')}
          className="px-6 py-2"
        >
          Go to {user ? 'Dashboard' : 'Login'}
        </Button>
      </div>
    </div>
  );
};

export default App;
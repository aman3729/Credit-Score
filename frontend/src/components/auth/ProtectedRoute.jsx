import React, { useEffect, useMemo } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/use-toast';

/**
 * ProtectedRoute component for authentication and role-based access control
 * @param {Object} props - Component props
 * @param {Object} props.user - Current user object
 * @param {string|Array} props.requiredRole - Required role(s) for access
 * @param {React.ReactNode} props.children - Child components to render
 */
const ProtectedRoute = ({ user, requiredRole, children }) => {
  const location = useLocation();
  const { toast } = useToast();

  // Check if user has required role
  const hasRequiredRole = useMemo(() => {
    if (!requiredRole) return true;
    
    const userRole = user?.role || 'user';
    const isAdmin = userRole === 'admin';
    
    // Admin always has access
    if (isAdmin) return true;
    
    // Handle both string and array of roles
    const requiredRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return requiredRoles.includes(userRole);
  }, [user, requiredRole]);

  // Show access denied toast
  useEffect(() => {
    if (user && !hasRequiredRole) {
      toast({
        title: 'Access Denied',
        description: `You don't have permission to access this page. Required role: ${Array.isArray(requiredRole) ? requiredRole.join(' or ') : requiredRole}`,
        variant: 'destructive',
      });
    }
  }, [user, hasRequiredRole, requiredRole, toast]);

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to dashboard if user doesn't have required role
  if (!hasRequiredRole) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children or Outlet
  return children || <Outlet />;
};

export default ProtectedRoute; 
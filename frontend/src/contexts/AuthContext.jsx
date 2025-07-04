// context/AuthContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '../hooks/use-toast';
import * as authService from '../services/authService';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const normalizeUser = (userData) => {
    if (!userData) return null;
    return {
      ...userData,
      id: userData.id || userData._id || '',
      email: userData.email || '',
      name:
        userData.name ||
        `${userData.firstName || ''} ${userData.lastName || ''}`.trim() ||
        userData.username ||
        'User',
      role: userData.role || 'user',
    };
  };

  const checkAuth = useCallback(async () => {
    try {
      console.debug('[Auth] Checking authentication status...');
      setLoading(true);

      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Authentication check timed out')), 5000)
      );

      const result = await Promise.race([
        authService.verifyToken(),
        timeoutPromise,
      ]);

      if (result?.valid && result.user) {
        const normalized = normalizeUser(result.user);
        console.debug('[Auth] Authenticated user:', normalized);
        setUser(normalized);
      } else {
        console.debug('[Auth] Invalid session');
        authService.removeToken();
        setUser(null);
      }
    } catch (error) {
      console.error('[Auth] Auth check error:', error);

      const message =
        error?.message === 'Authentication check timed out'
          ? 'Connection to server timed out.'
          : 'Authentication failed.';

      if (!error.response || error.message.includes('timeout')) {
        toast({
          title: 'Connection Error',
          description: message,
          variant: 'destructive',
        });
      } else if (error.response.status === 401) {
        authService.removeToken();
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      if (!user && isMounted) {
        await checkAuth();
      } else {
        setLoading(false);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, [checkAuth, user]);

  const login = useCallback(async (email, password) => {
    try {
      console.debug('[Auth] Logging in...');
      const res = await authService.login(email, password);

      const authenticatedUser = normalizeUser(res.user);
      setUser(authenticatedUser);

      toast({
        title: 'Success',
        description: 'Logged in successfully',
        variant: 'success',
      });

      // Return the user for potential role-based navigation
      return authenticatedUser;
    } catch (error) {
      console.error('[Auth] Login error:', error);

      toast({
        title: 'Login Failed',
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Authentication failed. Please try again.',
        variant: 'destructive',
      });

      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (error) {
      console.warn('[Auth] Logout error:', error);
    } finally {
      authService.removeToken();
      setUser(null);
      navigate('/login');

      toast({
        title: 'Logged out',
        description: 'You have been logged out.',
        variant: 'default',
      });
    }
  }, [navigate]);

  const register = useCallback(async (userData) => {
    try {
      console.debug('[Auth] Registering...');
      const res = await authService.register(userData);

      const registeredUser = normalizeUser(res.user);
      setUser(registeredUser);

      toast({
        title: 'Welcome!',
        description: 'Account created successfully',
        variant: 'success',
      });

      return registeredUser;
    } catch (error) {
      console.error('[Auth] Registration error:', error);

      toast({
        title: 'Registration Failed',
        description:
          error?.response?.data?.message ||
          error?.message ||
          'Registration failed. Please try again.',
        variant: 'destructive',
      });

      throw error;
    }
  }, []);

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    isAuthenticated: !!user?.email,
    role: user?.role || 'guest',
    checkAuth,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;

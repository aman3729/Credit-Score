import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Sun, Moon, LogOut, User, Menu, X } from 'lucide-react';
import NavLink from './ui/NavLink';

const Navigation = ({ darkMode, toggleDarkMode, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Combine props with context for flexibility
  const currentUser = user || {};
  const isAuthenticated = !!user;
  
  // Close mobile menu when location changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  // Don't show navigation on auth pages
  const hideNav = ['/login', '/register', '/verify-email'].includes(location.pathname);
  if (hideNav) {
    return null;
  }
  
  // Toggle dark mode
  const handleDarkModeToggle = () => {
    if (toggleDarkMode) {
      toggleDarkMode();
    }
  };
  
  const handleLogout = async () => {
    try {
      if (onLogout) {
        await onLogout();
      } else {
        await logout();
      }
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  
  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <nav className="bg-white dark:bg-gray-800 shadow-md fixed w-full top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">
                Credit Score
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:ml-10 md:flex md:space-x-2">
              <NavLink to="/dashboard" activePath="/dashboard">
                Dashboard
              </NavLink>
              
              {currentUser?.role === 'admin' && (
                <NavLink to="/admin" activePath="/admin">
                  Admin
                </NavLink>
              )}
              
              {(currentUser?.role === 'lender' || currentUser?.role === 'admin') && (
                <NavLink 
                  to="/lender"
                  activePath="/lender"
                >
                  Lender
                </NavLink>
              )}
            </div>
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center space-x-2">
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDarkModeToggle}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white"
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
            
            {isAuthenticated ? (
              <div className="flex items-center space-x-2">
                <div className="hidden md:flex items-center space-x-2">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user?.firstName || user?.username || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role || 'user'}
                    </span>
                  </div>
                  <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <User className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
                
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={toggleMobileMenu}
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? (
                    <X className="h-6 w-6" />
                  ) : (
                    <Menu className="h-6 w-6" />
                  )}
                </Button>
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-2">
                <Button
                  asChild
                  variant="ghost"
                  className="text-gray-700 dark:text-gray-200"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button asChild variant="default">
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-gray-800 shadow-lg">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <NavLink to="/dashboard" activePath="/dashboard">
              Dashboard
            </NavLink>
            
            {currentUser?.role === 'admin' && (
              <NavLink to="/admin" activePath="/admin">
                Admin Dashboard
              </NavLink>
            )}
            
            {(currentUser?.role === 'lender' || currentUser?.role === 'admin') && (
              <NavLink 
                to={user?.id ? `/lender/${user.id}` : '/lender'}
                activePath="/lender"
              >
                Lender Dashboard
              </NavLink>
            )}
            
            {isAuthenticated && (
              <>
                <div className="border-t border-gray-200 dark:border-gray-700 my-2"></div>
                <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                  Logged in as: {user?.email}
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900 rounded-md"
                >
                  Sign out
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;

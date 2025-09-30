import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Sun, Moon, LogOut, User, Menu, X, CreditCard, LayoutDashboard, ShieldCheck, BarChart4 } from 'lucide-react';

const NavLink = ({ to, children, activePath }) => {
  const location = useLocation();
  const isActive = location.pathname === to || 
                  (activePath && location.pathname.startsWith(activePath));
  
  return (
    <Link
      to={to}
      className={`flex items-center px-3 py-2 rounded-lg transition-all duration-200 ${
        isActive 
          ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-md'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      }`}
    >
      {children}
    </Link>
  );
};

const Navigation = ({ darkMode, toggleDarkMode, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  
  const currentUser = user || {};
  const isAuthenticated = !!user;
  
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  const hideNav = ['/login', '/register', '/verify-email'].includes(location.pathname);
  if (hideNav) return null;
  
  const handleDarkModeToggle = () => toggleDarkMode?.();
  
  const handleLogout = async () => {
    try {
      await (onLogout ? onLogout() : logout());
      navigate('/login', { replace: true });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <nav 
      className={`fixed w-full top-0 z-50 transition-all duration-300 ${
        scrolled 
          ? 'bg-white/90 dark:bg-[#0f0f10]/90 backdrop-blur-md shadow-lg py-2' 
          : 'bg-transparent py-3'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 group"
          >
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-2 rounded-lg group-hover:scale-105 transition-transform">
              <CreditCard className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              MVOscore
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            <NavLink to="/dashboard" activePath="/dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </NavLink>
            
            {(currentUser?.premium?.isPremium || currentUser?.role === 'admin') && (
              <NavLink to="/premium" activePath="/premium">
                <BarChart4 className="h-4 w-4 mr-2" />
                Premium
              </NavLink>
            )}
            
            {currentUser?.role === 'admin' && (
              <NavLink to="/admin" activePath="/admin">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Admin
              </NavLink>
            )}
            
            {(currentUser?.role === 'lender' || currentUser?.role === 'admin') && (
              <NavLink to="/lender" activePath="/lender">
                <BarChart4 className="h-4 w-4 mr-2" />
                Lender
              </NavLink>
            )}
          </div>
          
          {/* Right side controls */}
          <div className="flex items-center space-x-2">
            {/* Dark mode toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleDarkModeToggle}
              className="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 rounded-full"
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
                {/* User profile */}
                <div className="hidden md:flex items-center space-x-3">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                      {user?.firstName || user?.username || 'User'}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {user?.role || 'user'}
                    </span>
                  </div>
                  <div className="h-9 w-9 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                    <span className="text-white font-medium">
                      {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                    </span>
                  </div>
                </div>
                
                {/* Logout button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="text-gray-500 hover:bg-red-50 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400 rounded-full"
                  aria-label="Logout"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
                
                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                  className="text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <Link to="/login">Sign In</Link>
                </Button>
                <Button 
                  asChild 
                  variant="default"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                >
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className={`md:hidden bg-white dark:bg-gray-900 shadow-xl rounded-lg mx-4 mt-2 overflow-hidden transition-all duration-300 ${
          mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <div className="px-4 pt-3 pb-4 space-y-1">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-200 dark:border-gray-800">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center">
                  <span className="text-white font-medium">
                    {(user?.firstName?.[0] || user?.username?.[0] || 'U').toUpperCase()}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {user?.firstName || user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={handleLogout}
                className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
            
            <NavLink to="/dashboard" activePath="/dashboard">
              <LayoutDashboard className="h-4 w-4 mr-2" />
              Dashboard
            </NavLink>
            
            {(currentUser?.premium?.isPremium || currentUser?.role === 'admin') && (
              <NavLink to="/premium" activePath="/premium">
                <BarChart4 className="h-4 w-4 mr-2" />
                Premium
              </NavLink>
            )}
            
            {currentUser?.role === 'admin' && (
              <NavLink to="/admin" activePath="/admin">
                <ShieldCheck className="h-4 w-4 mr-2" />
                Admin
              </NavLink>
            )}
            
            {(currentUser?.role === 'lender' || currentUser?.role === 'admin') && (
              <NavLink to="/lender" activePath="/lender">
                <BarChart4 className="h-4 w-4 mr-2" />
                Lender
              </NavLink>
            )}
            
            <div className="pt-2 border-t border-gray-200 dark:border-gray-800">
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {darkMode ? 'Light Mode' : 'Dark Mode'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDarkModeToggle}
                  className="text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  {darkMode ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Moon className="h-5 w-5" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
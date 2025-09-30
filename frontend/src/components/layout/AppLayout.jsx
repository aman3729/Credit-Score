import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Navigation from '../Navigation';
import DarkModeToggle from '../DarkModeToggle';

/**
 * AppLayout component that provides common layout for authenticated pages
 */
const AppLayout = () => {
  const { user, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);

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

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation */}
      <Navigation 
        darkMode={darkMode} 
        toggleDarkMode={toggleDarkMode}
        onLogout={handleLogout}
        userRole={user?.role}
      />
      
      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-8">
        <Outlet />
      </main>
      
      {/* Footer */}
      <footer className="bg-card border-t border-border py-4">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© {new Date().getFullYear()} Credit Score Dashboard. All rights reserved.</p>
          <p className="text-sm mt-1">
            Logged in as: {user?.email} ({user?.role || 'user'})
          </p>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout; 
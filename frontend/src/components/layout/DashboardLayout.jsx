import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * DashboardLayout - A flexible layout component for dashboard pages
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.header - Header content
 * @param {React.ReactNode} props.left - Content for the left sidebar
 * @param {React.ReactNode} props.center - Main content area
 * @param {React.ReactNode} props.right - Content for the right sidebar
 * @param {string} [props.userName='User'] - Name of the current user
 * @param {Function} [props.onLogout] - Callback for logout action
 */
const DashboardLayout = ({ header, left, center, right, userName = 'User', onLogout }) => {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 transition-colors duration-200">
      {/* Fixed Header */}
      {header && (
        <header className="fixed top-0 left-0 right-0 z-40 bg-white/90 dark:bg-[#0D261C]/90 backdrop-blur-xl shadow-lg border-b border-gray-200 dark:border-gray-800">
          {header}
        </header>
      )}
      
      {/* Main Content - Add padding to account for fixed header and mobile nav */}
      <main className="pt-0 pb-24 md:pb-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Sidebar - 25% on desktop, full width on mobile */}
            {left && (
              <aside className="lg:col-span-3 col-span-12 space-y-8">
                {left}
              </aside>
            )}

            {/* Main Content - Adjusts based on sidebars */}
            <div 
              className={`space-y-8 ${
                left && right 
                  ? 'lg:col-span-6 col-span-12' 
                  : left || right 
                    ? 'lg:col-span-9 col-span-12'
                    : 'col-span-12'
              }`}
            >
              {center}
            </div>

            {/* Right Sidebar - 25% on desktop, full width on mobile */}
            {right && (
              <aside className="lg:col-span-3 col-span-12 space-y-8">
                {right}
              </aside>
            )}
          </div>
        </div>
      </main>
      
      {/* Mobile Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden flex justify-around items-center bg-white/90 dark:bg-[#1a2c24]/90 border-t border-gray-200 dark:border-gray-800 shadow-lg py-3 px-2">
        <button className="flex flex-col items-center text-xs p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Dashboard
        </button>
        <button className="flex flex-col items-center text-xs p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Reports
        </button>
        <button className="flex flex-col items-center text-xs p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Profile
        </button>
      </nav>
      
      <Outlet />
    </div>
  );
};

DashboardLayout.propTypes = {
  header: PropTypes.node,
  left: PropTypes.node,
  center: PropTypes.node,
  right: PropTypes.node,
  userName: PropTypes.string,
  onLogout: PropTypes.func
};

export default DashboardLayout;
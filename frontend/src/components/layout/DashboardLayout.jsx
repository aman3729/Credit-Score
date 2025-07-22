import React from 'react';
import { Outlet } from 'react-router-dom';
import PropTypes from 'prop-types';

/**
 * DashboardLayout - A flexible layout component for dashboard pages
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.left - Content for the left sidebar
 * @param {React.ReactNode} props.center - Main content area
 * @param {React.ReactNode} props.right - Content for the right sidebar
 * @param {string} [props.userName='User'] - Name of the current user
 * @param {Function} [props.onLogout] - Callback for logout action
 */
const DashboardLayout = ({ left, center, right, userName = 'User', onLogout }) => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Main Content - Add padding top to account for fixed navigation */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="grid grid-cols-12 gap-6">
            {/* Left Sidebar - 25% */}
            {left && (
              <aside className="col-span-12 lg:col-span-3 space-y-6">
                {left}
              </aside>
            )}

            {/* Main Content - 50% or full width if no sidebars */}
            <div className={`space-y-6 ${left && right ? 'col-span-12 lg:col-span-6' : left || right ? 'col-span-12 lg:col-span-9' : 'col-span-12'}`}>
              {center}
            </div>

            {/* Right Sidebar - 25% */}
            {right && (
              <aside className="col-span-12 lg:col-span-3 space-y-6">
                {right}
              </aside>
            )}
          </div>
        </div>
      </main>
      
      <Outlet />
    </div>
  );
};

DashboardLayout.propTypes = {
  left: PropTypes.node,
  center: PropTypes.node,
  right: PropTypes.node,
  userName: PropTypes.string,
  onLogout: PropTypes.func
};

export default DashboardLayout;

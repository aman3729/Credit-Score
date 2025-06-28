import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const NavLink = ({ to, children, activePath, className = '', ...props }) => {
  const location = useLocation();
  const isActive = location.pathname === to || 
                  (activePath && location.pathname.startsWith(activePath));
  
  return (
    <Link
      to={to}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100'
          : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
      } ${className}`}
      {...props}
    >
      {children}
    </Link>
  );
};

export default NavLink;

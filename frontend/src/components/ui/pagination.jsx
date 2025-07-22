import React from 'react';

export function Pagination({ children, className = '', ...props }) {
  return (
    <nav className={`flex items-center justify-center ${className}`} aria-label="Pagination" {...props}>
      {children}
    </nav>
  );
}

export function PaginationContent({ children, className = '', ...props }) {
  return (
    <ul className={`inline-flex items-center gap-1 ${className}`} {...props}>
      {children}
    </ul>
  );
}

export function PaginationItem({ children, className = '', ...props }) {
  return (
    <li className={className} {...props}>
      {children}
    </li>
  );
}

export function PaginationLink({ isActive, children, className = '', ...props }) {
  return (
    <button
      type="button"
      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4caf50] ${
        isActive ? 'bg-[#4caf50] text-white' : 'bg-white dark:bg-[#1a4a38] text-gray-700 dark:text-[#a8d5ba] hover:bg-[#f0f7f4] dark:hover:bg-[#22372b]'
      } ${className}`}
      aria-current={isActive ? 'page' : undefined}
      {...props}
    >
      {children}
    </button>
  );
}

export function PaginationPrevious({ onClick, disabled, className = '', ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-[#a8d5ba] bg-white dark:bg-[#1a4a38] border border-gray-200 dark:border-[#1a4a38] hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      aria-label="Previous page"
      {...props}
    >
      &larr;
    </button>
  );
}

export function PaginationNext({ onClick, disabled, className = '', ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`px-2 py-1.5 rounded-md text-sm font-medium text-gray-700 dark:text-[#a8d5ba] bg-white dark:bg-[#1a4a38] border border-gray-200 dark:border-[#1a4a38] hover:bg-[#f0f7f4] dark:hover:bg-[#22372b] transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      aria-label="Next page"
      {...props}
    >
      &rarr;
    </button>
  );
} 
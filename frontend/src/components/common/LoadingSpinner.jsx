import React from 'react';
import { cn } from '../../lib/utils';

/**
 * LoadingSpinner component for consistent loading states
 * @param {Object} props - Component props
 * @param {string} props.message - Optional loading message
 * @param {string} props.size - Size of spinner (sm, md, lg)
 * @param {string} props.className - Additional CSS classes
 */
const LoadingSpinner = ({ 
  message = "Loading...", 
  size = "md", 
  className 
}) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8", 
    lg: "h-12 w-12"
  };

  return (
    <div className={cn(
      "flex flex-col items-center justify-center min-h-[200px]",
      className
    )}>
      <div 
        className={cn(
          "animate-spin rounded-full border-2 border-muted border-t-primary",
          sizeClasses[size]
        )}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="mt-4 text-sm text-muted-foreground text-center">
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner; 
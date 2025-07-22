import React from 'react';

const Card = ({ 
  children, 
  className = '',
  ...props 
}) => (
  <div 
    className={`bg-white dark:bg-[#18191a] rounded-xl shadow-sm p-6 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;

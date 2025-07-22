import React from 'react';
import { CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';

const DecisionBadge = ({ decision, size = 'default' }) => {
  const baseClasses = 'inline-flex items-center rounded-full text-xs font-medium';
  const sizeClasses = size === 'large' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';
  const iconSize = size === 'large' ? 'h-4 w-4' : 'h-3 w-3';

  switch ((decision || '').toLowerCase()) {
    case 'approve':
      return (
        <span className={`${baseClasses} ${sizeClasses} bg-green-100 text-green-800`}>
          <CheckCircle2 className={`${iconSize} mr-1`} />
          Approved
        </span>
      );
    case 'reject':
      return (
        <span className={`${baseClasses} ${sizeClasses} bg-red-100 text-red-800`}>
          <XCircle className={`${iconSize} mr-1`} />
          Rejected
        </span>
      );
    case 'hold':
      return (
        <span className={`${baseClasses} ${sizeClasses} bg-orange-100 text-orange-800`}>
          <Clock className={`${iconSize} mr-1`} />
          Hold
        </span>
      );
    case 'review':
    default:
      return (
        <span className={`${baseClasses} ${sizeClasses} bg-yellow-100 text-yellow-800`}>
          <AlertCircle className={`${iconSize} mr-1`} />
          Review
        </span>
      );
  }
};

export default DecisionBadge; 
import React from 'react';
import { cva } from 'class-variance-authority';
import { cn } from '../../lib/utils';
import { 
  CheckCircle2, 
  XCircle, 
  Info, 
  AlertTriangle, 
  Bell, 
  Clock,
  X,
  ExternalLink,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from './button';
import { Badge } from './badge';

// Icon mapping for notification types
const notificationIcons = {
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  error: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
  info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  notification: <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
  pending: <Clock className="h-5 w-5 text-gray-600 dark:text-gray-400" />,
};

// Notification variants
const notificationVariants = cva(
  "relative overflow-hidden rounded-xl border p-6 shadow-lg transition-all duration-300 ease-in-out bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:shadow-xl",
  {
    variants: {
      variant: {
        default: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
        success: "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/30",
        error: "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/30",
        warning: "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30",
        info: "border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30",
        notification: "border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30",
        pending: "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30",
      },
      size: {
        sm: "p-4",
        md: "p-6",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

// Enhanced Notification Component
const Notification = React.forwardRef(({ 
  className, 
  variant = "default", 
  size = "md",
  title, 
  description, 
  timestamp,
  actions = [],
  dismissible = true,
  onDismiss,
  badge,
  icon,
  children,
  ...props 
}, ref) => {
  const [isVisible, setIsVisible] = React.useState(true);
  const [isExpanded, setIsExpanded] = React.useState(false);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss?.();
    }, 300);
  };

  const handleAction = (action) => {
    if (action.onClick) {
      action.onClick();
    }
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={ref}
      className={cn(
        notificationVariants({ variant, size }),
        "transform transition-all duration-300 ease-out",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Icon */}
          <div className="flex-shrink-0 mt-1">
            <div className="p-2 rounded-lg bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700">
              {icon || notificationIcons[variant]}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  {title && (
                    <h4 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {title}
                    </h4>
                  )}
                  {badge && (
                    <Badge variant={badge.variant || "secondary"} className="text-xs">
                      {badge.text}
                    </Badge>
                  )}
                </div>
                {description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                    {description}
                  </p>
                )}
                {timestamp && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {timestamp}
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            {actions.length > 0 && (
              <div className="flex items-center gap-2 mt-4">
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    variant={action.variant || "outline"}
                    size="sm"
                    onClick={() => handleAction(action)}
                    className="text-xs"
                  >
                    {action.icon && <action.icon className="h-3 w-3 mr-1" />}
                    {action.label}
                  </Button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Dismiss button */}
        {dismissible && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 h-8 w-8 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Expandable content */}
      {children && (
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          >
            {isExpanded ? (
              <>
                <EyeOff className="h-3 w-3 mr-1" />
                Hide Details
              </>
            ) : (
              <>
                <Eye className="h-3 w-3 mr-1" />
                Show Details
              </>
            )}
          </Button>
          
          {isExpanded && (
            <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              {children}
            </div>
          )}
        </div>
      )}

      {/* Progress bar for auto-dismiss */}
      <div className="absolute left-0 bottom-0 h-1 w-full bg-gray-200 dark:bg-gray-700">
        <div className="h-1 bg-blue-500 dark:bg-blue-400 transition-all duration-[5s] ease-linear" />
      </div>
    </div>
  );
});

Notification.displayName = "Notification";

// Notification Container
const NotificationContainer = ({ children, className, ...props }) => {
  return (
    <div
      className={cn(
        "fixed top-4 right-4 z-[100] flex flex-col gap-4 max-w-md w-full",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

// Notification Group
const NotificationGroup = ({ notifications = [], onDismiss, className, ...props }) => {
  return (
    <div className={cn("space-y-4", className)} {...props}>
      {notifications.map((notification, index) => (
        <Notification
          key={notification.id || index}
          {...notification}
          onDismiss={() => onDismiss?.(notification.id || index)}
        />
      ))}
    </div>
  );
};

// Predefined notification types
const NotificationTypes = {
  Success: ({ title, description, ...props }) => (
    <Notification
      variant="success"
      title={title}
      description={description}
      {...props}
    />
  ),
  
  Error: ({ title, description, ...props }) => (
    <Notification
      variant="error"
      title={title}
      description={description}
      {...props}
    />
  ),
  
  Warning: ({ title, description, ...props }) => (
    <Notification
      variant="warning"
      title={title}
      description={description}
      {...props}
    />
  ),
  
  Info: ({ title, description, ...props }) => (
    <Notification
      variant="info"
      title={title}
      description={description}
      {...props}
    />
  ),
  
  Pending: ({ title, description, ...props }) => (
    <Notification
      variant="pending"
      title={title}
      description={description}
      {...props}
    />
  ),
};

export {
  Notification,
  NotificationContainer,
  NotificationGroup,
  NotificationTypes,
  notificationVariants,
  notificationIcons,
}; 
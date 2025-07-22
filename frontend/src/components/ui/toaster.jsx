import * as React from "react"
import * as ToastPrimitives from "@radix-ui/react-toast"
import { cva } from "class-variance-authority"
import { X, CheckCircle2, XCircle, Info, AlertTriangle, Clock, Bell } from "lucide-react"
import { cn } from "../../lib/utils"
import { useToast } from "../../hooks/use-toast"

const ToastProvider = ToastPrimitives.Provider

const ToastViewport = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      "fixed top-4 right-4 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-4 sm:right-4 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
))
ToastViewport.displayName = ToastPrimitives.Viewport.displayName

// Enhanced icon mapping for variants with better visual hierarchy and background
const variantIconBg = {
  default: 'bg-blue-100 dark:bg-blue-900',
  success: 'bg-emerald-100 dark:bg-emerald-900',
  error: 'bg-red-100 dark:bg-red-900',
  warning: 'bg-amber-100 dark:bg-amber-900',
  destructive: 'bg-red-100 dark:bg-red-900',
  info: 'bg-blue-100 dark:bg-blue-900',
  notification: 'bg-purple-100 dark:bg-purple-900',
};

const variantIcons = {
  default: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  success: <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
  error: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
  warning: <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
  destructive: <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />,
  info: <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
  notification: <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />,
};

// Glassmorphism + modern shadow + more padding + border
const toastVariants = cva(
  "group pointer-events-auto relative flex w-full items-start gap-4 overflow-hidden rounded-2xl border p-6 pr-10 shadow-2xl transition-all duration-300 ease-in-out",
  "bg-white/70 dark:bg-gray-900/80 border-gray-200/70 dark:border-gray-700/70 backdrop-blur-md",
  "data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]",
  "data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none",
  "data-[state=open]:animate-in data-[state=closed]:animate-out",
  "data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full",
  "data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full",
  "hover:shadow-3xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/20",
  {
    variants: {
      variant: {
        default: "border-blue-200 dark:border-blue-800",
        success: "border-emerald-200 dark:border-emerald-800",
        error: "border-red-200 dark:border-red-800",
        warning: "border-amber-200 dark:border-amber-800",
        destructive: "border-red-200 dark:border-red-800",
        info: "border-blue-200 dark:border-blue-800",
        notification: "border-purple-200 dark:border-purple-800",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

const Toast = React.forwardRef(({ className, variant, ...props }, ref) => {
  return (
    <ToastPrimitives.Root
      ref={ref}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  )
})
Toast.displayName = ToastPrimitives.Root.displayName

const ToastAction = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive",
      className
    )}
    {...props}
  />
))
ToastAction.displayName = ToastPrimitives.Action.displayName

const ToastClose = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      "absolute right-2 top-2 rounded-md p-1.5 text-foreground/50 opacity-0 transition-all duration-200 hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:hover:bg-red-100 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
))
ToastClose.displayName = ToastPrimitives.Close.displayName

const ToastTitle = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn("text-sm font-semibold text-gray-900 dark:text-gray-100", className)}
    {...props}
  />
))
ToastTitle.displayName = ToastPrimitives.Title.displayName

const ToastDescription = React.forwardRef(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn("text-sm text-gray-700 dark:text-gray-300 leading-relaxed", className)}
    {...props}
  />
))
ToastDescription.displayName = ToastPrimitives.Description.displayName

// Enhanced progress bar component with better visual design
const ToastProgress = ({ duration = 4000, variant = "default" }) => {
  const [width, setWidth] = React.useState("100%");

  React.useEffect(() => {
    const timer = setTimeout(() => {
      setWidth("0%");
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const getProgressColor = (variant) => {
    switch (variant) {
      case 'success':
        return 'bg-gradient-to-r from-emerald-400 to-emerald-600';
      case 'error':
      case 'destructive':
        return 'bg-gradient-to-r from-red-400 to-red-600';
      case 'warning':
        return 'bg-gradient-to-r from-amber-400 to-amber-600';
      case 'info':
      case 'notification':
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
      default:
        return 'bg-gradient-to-r from-blue-400 to-blue-600';
    }
  };

  return (
    <div className="absolute left-4 bottom-4 h-1 w-[calc(100%-2rem)] bg-gray-200/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
      <div
        className={`h-full ${getProgressColor(variant)} transition-all duration-[4000ms] ease-linear rounded-full`}
        style={{ width, transitionDuration: `${duration}ms` }}
      />
    </div>
  );
};

// Enhanced toast component with better layout and accessibility
const EnhancedToast = ({ id, title, description, action, variant = "default", duration = 4000, ...props }) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Toast
      key={id}
      variant={variant}
      className={cn(
        "transform transition-all duration-300 ease-out",
        isVisible ? "translate-x-0 opacity-100 scale-100" : "translate-x-full opacity-0 scale-95"
      )}
      {...props}
    >
      <div className="flex items-center gap-4 w-full">
        {/* Icon with colored background */}
        <div className={cn("flex-shrink-0 p-2 rounded-full shadow-sm", variantIconBg[variant] || variantIconBg.default)}>
          {variantIcons[variant] || variantIcons.default}
        </div>
        {/* Content area */}
        <div className="flex-1 min-w-0">
          {title && (
            <ToastTitle className="text-base font-bold text-gray-900 dark:text-white mb-0.5">
              {title}
            </ToastTitle>
          )}
          {description && (
            <ToastDescription className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {description}
            </ToastDescription>
          )}
        </div>
        {/* Action buttons */}
        {action && (
          <div className="flex-shrink-0 ml-2">
            {action}
          </div>
        )}
        {/* Close button */}
        <ToastClose className="opacity-100 hover:scale-110 transition-transform duration-200 focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 bg-white/60 dark:bg-gray-800/60 rounded-full p-2 ml-2 shadow-md" />
      </div>
      {/* Enhanced progress bar */}
      <ToastProgress duration={duration} variant={variant} />
    </Toast>
  );
};

// Toast component props
export const toastProps = {
  variant: {
    default: 'default',
    success: 'success',
    error: 'error',
    warning: 'warning',
    destructive: 'destructive',
    info: 'info',
    notification: 'notification'
  }
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
}

// Main Toaster component with enhanced features
export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, variant = "default", duration = 4000, ...props }) => {
        return (
          <EnhancedToast
            key={id}
            id={id}
            title={title}
            description={description}
            action={action}
            variant={variant}
            duration={duration}
            {...props}
          />
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
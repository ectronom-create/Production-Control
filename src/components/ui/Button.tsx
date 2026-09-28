import { forwardRef } from 'react';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, leftIcon, rightIcon, children, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none disabled:opacity-50',
          size === 'sm' && 'h-8 px-3 text-sm',
          size === 'md' && 'h-10 px-4 text-sm',
          size === 'lg' && 'h-12 px-6 text-base',
          variant === 'primary' && 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-primary-500 dark:hover:bg-primary-600',
          variant === 'secondary' && 'bg-industrial-100 text-industrial-900 hover:bg-industrial-200 dark:bg-industrial-700 dark:text-industrial-100 dark:hover:bg-industrial-600',
          variant === 'danger' && 'bg-red-600 text-white hover:bg-red-700',
          variant === 'ghost' && 'text-industrial-600 hover:bg-industrial-100 dark:text-industrial-300 dark:hover:bg-industrial-800',
          variant === 'outline' && 'border border-industrial-300 text-industrial-700 hover:bg-industrial-50 dark:border-industrial-600 dark:text-industrial-200 dark:hover:bg-industrial-800',
          className
        )}
        {...props}
      >
        {loading ? <Spinner size="sm" /> : leftIcon}
        {children}
        {!loading && rightIcon}
      </button>
    );
  }
);
Button.displayName = 'Button';

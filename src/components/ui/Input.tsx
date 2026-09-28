import { forwardRef } from 'react';
import { cn } from './cn';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-industrial-700 dark:text-industrial-300"
          >
            {label}
            {props.required && <span className="text-red-500 ms-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
            'bg-white dark:bg-industrial-900',
            'text-industrial-900 dark:text-industrial-50',
            'placeholder:text-industrial-400 dark:placeholder:text-industrial-500',
            error
              ? 'border-red-400 focus:border-red-500 focus:ring-red-200'
              : 'border-industrial-300 dark:border-industrial-600 focus:border-primary-500 focus:ring-primary-200 dark:focus:border-primary-400',
            'focus:outline-none focus:ring-2',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helper && !error && <p className="text-xs text-industrial-400 dark:text-industrial-500">{helper}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helper?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, helper, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div className="space-y-1">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-industrial-700 dark:text-industrial-300"
          >
            {label}
            {props.required && <span className="text-red-500 ms-1">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={inputId}
          rows={3}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors resize-none',
            'bg-white dark:bg-industrial-900',
            'text-industrial-900 dark:text-industrial-50',
            'placeholder:text-industrial-400',
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-industrial-300 dark:border-industrial-600 focus:border-primary-500 dark:focus:border-primary-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-200',
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helper && !error && <p className="text-xs text-industrial-400">{helper}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

import { forwardRef } from 'react';
import { cn } from './cn';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helper?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helper, options, placeholder, className, id, ...props }, ref) => {
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
        <select
          ref={ref}
          id={inputId}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm transition-colors appearance-none',
            'bg-white dark:bg-industrial-900',
            'text-industrial-900 dark:text-industrial-50',
            error
              ? 'border-red-400 focus:border-red-500'
              : 'border-industrial-300 dark:border-industrial-600 focus:border-primary-500 dark:focus:border-primary-400',
            'focus:outline-none focus:ring-2 focus:ring-primary-200',
            className
          )}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {helper && !error && <p className="text-xs text-industrial-400">{helper}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';

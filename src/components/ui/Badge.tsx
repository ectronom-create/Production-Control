import { cn } from './cn';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variant === 'default' && 'bg-industrial-100 text-industrial-800 dark:bg-industrial-700 dark:text-industrial-200',
        variant === 'success' && 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
        variant === 'warning' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
        variant === 'danger' && 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
        variant === 'info' && 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
        variant === 'outline' && 'border border-current',
        className
      )}
    >
      {children}
    </span>
  );
}

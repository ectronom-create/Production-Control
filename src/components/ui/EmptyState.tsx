import { cn } from './cn';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
      {icon && (
        <div className="mb-4 text-industrial-300 dark:text-industrial-600">{icon}</div>
      )}
      <h3 className="text-base font-medium text-industrial-700 dark:text-industrial-300">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-industrial-400 dark:text-industrial-500 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

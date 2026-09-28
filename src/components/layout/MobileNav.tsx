import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, ClipboardList, Sparkles } from 'lucide-react';
import { cn } from '../ui/cn';
import { useLanguage } from '../../hooks/useLanguage';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { to: '/downtime', icon: AlertTriangle, labelKey: 'downtime' as const },
  { to: '/daily-production', icon: ClipboardList, labelKey: 'dailyProduction' as const },
  { to: '/future', icon: Sparkles, labelKey: 'future' as const },
];

export function MobileNav() {
  const { t } = useLanguage();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 flex border-t border-industrial-200 bg-white dark:border-industrial-700 dark:bg-industrial-900 lg:hidden">
      {navItems.map(({ to, icon: Icon, labelKey }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center py-2 text-xs font-medium transition-colors',
              isActive
                ? 'text-primary-600 dark:text-primary-400'
                : 'text-industrial-400 dark:text-industrial-500'
            )
          }
        >
          {({ isActive }) => (
            <>
              <Icon size={20} className={isActive ? 'text-primary-600 dark:text-primary-400' : ''} />
              <span className="mt-0.5">{t(labelKey)}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

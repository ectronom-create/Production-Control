import { NavLink } from 'react-router-dom';
import { LayoutDashboard, AlertTriangle, ClipboardList, Sparkles, X, Factory } from 'lucide-react';
import { cn } from '../ui/cn';
import { useLanguage } from '../../hooks/useLanguage';
import { useAppContext } from '../../contexts/AppContext';
import { Badge } from '../ui/Badge';

const navItems = [
  { to: '/', icon: LayoutDashboard, labelKey: 'dashboard' as const },
  { to: '/downtime', icon: AlertTriangle, labelKey: 'downtime' as const },
  { to: '/daily-production', icon: ClipboardList, labelKey: 'dailyProduction' as const },
  { to: '/future', icon: Sparkles, labelKey: 'future' as const },
];

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ open, onClose }: SidebarProps) {
  const { t, isArabic } = useLanguage();
  const { profile } = useAppContext();

  return (
    <>
      {/* Overlay on mobile */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={cn(
          'fixed top-0 bottom-0 z-30 flex flex-col',
          'w-64 bg-industrial-900 dark:bg-industrial-950 text-white',
          'transition-transform duration-300',
          isArabic ? 'right-0' : 'left-0',
          isArabic
            ? (open ? 'translate-x-0' : 'translate-x-full')
            : (open ? 'translate-x-0' : '-translate-x-full'),
          'lg:translate-x-0 lg:static lg:z-auto lg:flex'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-industrial-700">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary-600">
              <Factory size={20} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-white leading-tight">
                {isArabic ? 'نظام التحكم' : 'Production'}
              </p>
              <p className="text-xs text-industrial-400">
                {isArabic ? 'الإنتاجي' : 'Control'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-industrial-400 hover:text-white p-1 rounded"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map(({ to, icon: Icon, labelKey }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              onClick={() => window.innerWidth < 1024 && onClose()}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-600 text-white'
                    : 'text-industrial-300 hover:bg-industrial-800 hover:text-white'
                )
              }
            >
              <Icon size={18} />
              {t(labelKey)}
            </NavLink>
          ))}
        </nav>

        {/* User info at bottom */}
        {profile && (
          <div className="px-4 py-4 border-t border-industrial-700">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-700 text-sm font-bold text-white">
                {profile.full_name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-white">{profile.full_name}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Badge variant="info" className="text-xs">{t(profile.role as 'admin' | 'supervisor' | 'operator' | 'viewer')}</Badge>
                  {profile.production_groups && (
                    <Badge variant="default" className="text-xs">{profile.production_groups.code}</Badge>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}

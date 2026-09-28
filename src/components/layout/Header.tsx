import { Menu, Sun, Moon, Globe, LogOut, Bell } from 'lucide-react';
import { Button } from '../ui/Button';
import { useLanguage } from '../../hooks/useLanguage';
import { useTheme } from '../../hooks/useTheme';
import { useAppContext } from '../../contexts/AppContext';
import { signOut } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../ui/Badge';

interface HeaderProps {
  onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const { t, toggleLanguage, isArabic } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { profile } = useAppContext();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch {
      toast.error(t('errorOccurred'));
    }
  };

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-industrial-200 bg-white px-4 dark:border-industrial-700 dark:bg-industrial-900 lg:px-6">
      {/* Mobile hamburger */}
      <Button variant="ghost" size="sm" className="lg:hidden" onClick={onMenuClick}>
        <Menu size={20} />
      </Button>

      {/* Page title or breadcrumb */}
      <div className="flex-1" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLanguage}
          className="gap-1.5 font-semibold"
          title={t('language')}
        >
          <Globe size={16} />
          {isArabic ? 'EN' : 'ع'}
        </Button>

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          title={theme === 'dark' ? t('lightMode') : t('darkMode')}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </Button>

        {/* Profile info */}
        {profile && (
          <div className="hidden sm:flex items-center gap-2 border-l border-industrial-200 dark:border-industrial-700 pl-3">
            <div className="text-right">
              <p className="text-sm font-medium text-industrial-900 dark:text-industrial-100 leading-tight">
                {profile.full_name}
              </p>
              <div className="flex items-center justify-end gap-1">
                <Badge variant="info" className="text-xs">{t(profile.role as 'admin' | 'supervisor' | 'operator' | 'viewer')}</Badge>
                {profile.production_groups && (
                  <Badge variant="default" className="text-xs">Grp {profile.production_groups.code}</Badge>
                )}
              </div>
            </div>
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary-600 text-sm font-bold text-white">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
          </div>
        )}

        {/* Logout */}
        <Button variant="ghost" size="sm" onClick={handleLogout} title={t('logout')}>
          <LogOut size={16} />
        </Button>
      </div>
    </header>
  );
}

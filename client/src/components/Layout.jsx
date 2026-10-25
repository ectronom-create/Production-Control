import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { Globe } from 'lucide-react';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    labelAr: 'لوحة التحكم',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    to: '/management-dashboard',
    label: 'Management',
    labelAr: 'لوحة الإدارة',
    roles: ['admin', 'viewer'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
  },
  {
    to: '/production',
    label: 'Production',
    labelAr: 'الإنتاج',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M5 20V10l7-7 7 7v10" /><path d="M9 20v-5h6v5" />
      </svg>
    ),
  },
  {
    to: '/crew',
    label: 'Line Crew',
    labelAr: 'طاقم العمل والمحطات',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    to: '/pre-production-checklist',
    label: 'Pre-Shift Checklist',
    labelAr: 'مهام التحقق قبل الإنتاج',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    to: '/downtime',
    label: 'Downtime',
    labelAr: 'أوقات التوقف',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: '/defect-meters',
    label: 'Defect Meters',
    labelAr: 'عدادات العيوب',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
      </svg>
    ),
  },
  {
    to: '/kit-meters',
    label: 'Kit Meters',
    labelAr: 'عدادات الكيت',
    roles: ['admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
  },
  {
    to: '/batches',
    label: 'Batches',
    labelAr: 'دفعات الإنتاج',
    roles: ['admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
  },
  {
    to: '/users',
    label: 'Users',
    labelAr: 'المستخدمين',
    roles: ['admin'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const MOBILE_BOTTOM_ITEMS = [
  {
    to: '/dashboard',
    labelAr: 'الرئيسية',
    labelEn: 'Home',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    )
  },
  {
    to: '/production',
    labelAr: 'الإنتاج',
    labelEn: 'Production',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h20M5 20V10l7-7 7 7v10" /><path d="M9 20v-5h6v5" />
      </svg>
    )
  },
  {
    to: '/crew',
    labelAr: 'طاقم العمل',
    labelEn: 'Crew',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    )
  },
  {
    to: '/pre-production-checklist',
    labelAr: 'التحقق',
    labelEn: 'Checklist',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 11l3 3L22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    )
  },
  {
    to: '/downtime',
    labelAr: 'التوقفات',
    labelEn: 'Downtime',
    roles: ['admin', 'supervisor'],
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
      </svg>
    )
  }
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { isArabic, canChangeLanguage, toggleLanguage, t } = useLanguage();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  function closeSidebar() { setSidebarOpen(false); }

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  const userRole = (user?.access || 'viewer').toLowerCase();
  const visibleNavItems = NAV_ITEMS.filter(item => !item.roles || item.roles.includes(userRole));

  return (
    <div className="app-shell">
      {/* ── Mobile topbar ── */}
      <header className="topbar">
        <button
          className="hamburger"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle menu"
        >
          <span /><span /><span />
        </button>
        <div className="topbar-logo-badge">
          <img src="/ectron-logo.png" alt="ECTRON" className="topbar-logo" />
        </div>

        {/* Mobile Language Switcher (Admin and Supervisor ONLY) */}
        {canChangeLanguage && (
          <button
            type="button"
            className="topbar-lang-toggle"
            onClick={toggleLanguage}
            title={isArabic ? 'Switch to English' : 'التحويل إلى العربية'}
            style={{
              marginLeft: isArabic ? 0 : 'auto',
              marginRight: isArabic ? 'auto' : 0,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.25)',
              color: '#ffffff',
              padding: '5px 10px',
              borderRadius: 6,
              fontSize: '0.78rem',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              cursor: 'pointer'
            }}
          >
            <Globe size={14} />
            <span>{isArabic ? 'English' : 'العربية'}</span>
          </button>
        )}
      </header>

      {/* ── Overlay ── */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? 'open' : ''}`}
        onClick={closeSidebar}
      />

      {/* ── Sidebar ── */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-logo-wrap">
          <div className="logo-badge">
            <img src="/ectron-logo.png" alt="ECTRON" className="sidebar-logo" />
          </div>
        </div>

        {/* Navigation links */}
        <nav className="sidebar-nav">
          {visibleNavItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              onClick={closeSidebar}
            >
              <span className="nav-icon">{item.icon}</span>
              {isArabic ? item.labelAr : item.label}
            </NavLink>
          ))}
        </nav>

        {/* Language Switcher in Sidebar (Admin and Supervisor ONLY) */}
        {canChangeLanguage && (
          <div style={{ padding: '0 16px 12px' }}>
            <button
              type="button"
              className="btn-lang-toggle"
              onClick={toggleLanguage}
              title={isArabic ? 'Switch to English' : 'التحويل إلى العربية'}
            >
              <Globe size={15} />
              <span>{isArabic ? 'English' : 'العربية'}</span>
            </button>
          </div>
        )}

        <div className="sidebar-footer">
          <div className="user-info">
            <div className="user-avatar">{initials}</div>
            <div className="user-details">
              <div className="user-name">{user?.name}</div>
              <div className="user-role">{user?.access}</div>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {t('logout', 'Logout')}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="main-content">
        <div className="page-container">
          <Outlet />
        </div>
      </main>

      {/* ── Mobile Bottom Navigation Bar (Phone Experience) ── */}
      <nav className="mobile-bottom-nav">
        {MOBILE_BOTTOM_ITEMS.filter(it => !it.roles || it.roles.includes(userRole)).map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `mobile-nav-btn ${isActive ? 'active' : ''}`}
            onClick={closeSidebar}
          >
            <span className="mobile-nav-icon">{item.icon}</span>
            <span className="mobile-nav-label">{isArabic ? item.labelAr : item.labelEn}</span>
          </NavLink>
        ))}

        {/* More / Menu Drawer Toggle */}
        <button
          type="button"
          className={`mobile-nav-btn ${sidebarOpen ? 'active' : ''}`}
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="Toggle Navigation Menu"
        >
          <span className="mobile-nav-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </span>
          <span className="mobile-nav-label">{isArabic ? 'المزيد' : 'More'}</span>
        </button>
      </nav>
    </div>
  );
}

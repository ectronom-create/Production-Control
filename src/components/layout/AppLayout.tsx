import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { useLanguage } from '../../hooks/useLanguage';

export function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isArabic } = useLanguage();

  return (
    <div className={`flex h-screen overflow-hidden bg-industrial-50 dark:bg-industrial-950 ${isArabic ? 'font-arabic' : ''}`}>
      {/* Desktop sidebar */}
      <div className="hidden lg:flex">
        <Sidebar open={true} onClose={() => {}} />
      </div>

      {/* Mobile sidebar */}
      <div className="lg:hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />

        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto max-w-7xl px-4 py-6 lg:px-6 pb-20 lg:pb-6">
            <Outlet />
          </div>
        </main>

        <MobileNav />
      </div>
    </div>
  );
}

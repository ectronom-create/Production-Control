import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { Toaster } from 'sonner';
import { AppProvider } from './contexts/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { FullPageSpinner } from './components/ui/Spinner';
import './lib/i18n'; // init i18n

// Lazy load pages for code splitting
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const DowntimePage = lazy(() => import('./pages/Downtime'));
const DailyProductionPage = lazy(() => import('./pages/DailyProduction'));
const FuturePage = lazy(() => import('./pages/Future'));

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageSpinner />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected */}
            <Route
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="downtime" element={<DowntimePage />} />
              <Route path="daily-production" element={<DailyProductionPage />} />
              <Route path="future" element={<FuturePage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Toaster
        position="top-right"
        richColors
        closeButton
        duration={4000}
      />
    </AppProvider>
  );
}

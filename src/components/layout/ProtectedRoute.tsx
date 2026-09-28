import { Navigate } from 'react-router-dom';
import { useAppContext } from '../../contexts/AppContext';
import { FullPageSpinner } from '../ui/Spinner';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAppContext();
  if (authLoading) return <FullPageSpinner />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

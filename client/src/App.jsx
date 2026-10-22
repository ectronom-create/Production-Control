import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManagementDashboard from './pages/ManagementDashboard';
import Downtime from './pages/Downtime';
import Production from './pages/Production';
import DefectMeters from './pages/DefectMeters';
import KitMeters from './pages/KitMeters';
import Batches from './pages/Batches';
import PreProductionChecklist from './pages/PreProductionChecklist';
import Users from './pages/Users';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

function IndexRedirect() {
  const { user } = useAuth();
  const role = (user?.access || 'viewer').toLowerCase();
  return <Navigate to={role === 'viewer' ? '/management-dashboard' : '/dashboard'} replace />;
}

function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  const role = (user?.access || 'viewer').toLowerCase();
  if (!allowedRoles.includes(role)) {
    return <Navigate to={role === 'viewer' ? '/management-dashboard' : '/dashboard'} replace />;
  }
  return children;
}

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <IndexRedirect /> : <Login />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<IndexRedirect />} />
        <Route
          path="dashboard"
          element={
            <RoleRoute allowedRoles={['admin', 'supervisor']}>
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="management-dashboard"
          element={
            <RoleRoute allowedRoles={['admin', 'viewer']}>
              <ManagementDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="production"
          element={
            <RoleRoute allowedRoles={['admin', 'supervisor']}>
              <Production />
            </RoleRoute>
          }
        />
        <Route
          path="pre-production-checklist"
          element={
            <RoleRoute allowedRoles={['admin', 'supervisor']}>
              <PreProductionChecklist />
            </RoleRoute>
          }
        />
        <Route
          path="downtime"
          element={
            <RoleRoute allowedRoles={['admin', 'supervisor']}>
              <Downtime />
            </RoleRoute>
          }
        />
        <Route
          path="defect-meters"
          element={
            <RoleRoute allowedRoles={['admin', 'supervisor']}>
              <DefectMeters />
            </RoleRoute>
          }
        />
        <Route
          path="kit-meters"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <KitMeters />
            </RoleRoute>
          }
        />
        <Route
          path="batches"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <Batches />
            </RoleRoute>
          }
        />
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={['admin']}>
              <Users />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

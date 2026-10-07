import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ManagementDashboard from './pages/ManagementDashboard';
import Downtime from './pages/Downtime';
import Production from './pages/Production';
import DefectMeters from './pages/DefectMeters';
import Users from './pages/Users';

function PrivateRoute({ children }) {
  const { token } = useAuth();
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={token ? <Navigate to="/" replace /> : <Login />}
      />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"              element={<Dashboard />} />
        <Route path="management-dashboard"   element={<ManagementDashboard />} />
        <Route path="downtime"               element={<Downtime />} />
        <Route path="production"             element={<Production />} />
        <Route path="defect-meters"          element={<DefectMeters />} />
        <Route path="users"                  element={<Users />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

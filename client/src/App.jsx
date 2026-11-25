import { lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import ChangePasswordForm from "./components/ChangePasswordForm";
import { homeFor } from "./utils/roles";

// Pages load on demand so the first screen opens fast on phones
const Dashboard = lazy(() => import("./pages/Dashboard"));
const ManagementDashboard = lazy(() => import("./pages/ManagementDashboard"));
const Downtime = lazy(() => import("./pages/Downtime"));
const Production = lazy(() => import("./pages/Production"));
const DefectMeters = lazy(() => import("./pages/DefectMeters"));
const KitMeters = lazy(() => import("./pages/KitMeters"));
const Batches = lazy(() => import("./pages/Batches"));
const BatchLookup = lazy(() => import("./pages/BatchLookup"));
const PreProductionChecklist = lazy(() => import("./pages/PreProductionChecklist"));
const CrewManagement = lazy(() => import("./pages/CrewManagement"));
const Users = lazy(() => import("./pages/Users"));
const EmployeeProfiles = lazy(() => import("./pages/EmployeeProfiles"));
const MyProfile = lazy(() => import("./pages/MyProfile"));

function PrivateRoute({ children }) {
  const { token, user } = useAuth();
  return token && user ? children : <Navigate to="/login" replace />;
}

function IndexRedirect() {
  const { user } = useAuth();
  return <Navigate to={homeFor((user?.access || "viewer").toLowerCase())} replace />;
}

function RoleRoute({ allowedRoles, children }) {
  const { user } = useAuth();
  const role = (user?.access || "viewer").toLowerCase();
  if (!allowedRoles.includes(role)) {
    return <Navigate to={homeFor(role)} replace />;
  }
  return children;
}

export default function App() {
  const { token, user, ready } = useAuth();
  const isLoggedIn = Boolean(token && user);

  // Wait until the saved session is checked, so a refresh doesn't bounce to /login.
  if (!ready) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <span className="spinner" />
      </div>
    );
  }

  // First login / password reset: a new password is required before anything else.
  if (isLoggedIn && user.must_change_password) {
    return <ChangePasswordForm forced />;
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={isLoggedIn ? <IndexRedirect /> : <Login />}
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
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <Dashboard />
            </RoleRoute>
          }
        />
        <Route
          path="management-dashboard"
          element={
            <RoleRoute allowedRoles={["admin", "viewer"]}>
              <ManagementDashboard />
            </RoleRoute>
          }
        />
        <Route
          path="production"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <Production />
            </RoleRoute>
          }
        />
        <Route
          path="crew"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <CrewManagement />
            </RoleRoute>
          }
        />
        <Route
          path="employees"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <EmployeeProfiles />
            </RoleRoute>
          }
        />
        <Route
          path="employees/:id"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <EmployeeProfiles />
            </RoleRoute>
          }
        />
        <Route
          path="pre-production-checklist"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <PreProductionChecklist />
            </RoleRoute>
          }
        />
        <Route
          path="downtime"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <Downtime />
            </RoleRoute>
          }
        />
        <Route
          path="defect-meters"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor"]}>
              <DefectMeters />
            </RoleRoute>
          }
        />
        <Route
          path="kit-meters"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <KitMeters />
            </RoleRoute>
          }
        />
        <Route
          path="batches"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Batches />
            </RoleRoute>
          }
        />
        <Route
          path="batch-lookup"
          element={
            <RoleRoute allowedRoles={["admin", "supervisor", "viewer"]}>
              <BatchLookup />
            </RoleRoute>
          }
        />
        <Route path="my-profile" element={<MyProfile />} />
        <Route
          path="users"
          element={
            <RoleRoute allowedRoles={["admin"]}>
              <Users />
            </RoleRoute>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

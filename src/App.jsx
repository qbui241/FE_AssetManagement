import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Loading } from './components/ui';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Assets from './pages/Assets';
import AssetDetail from './pages/AssetDetail';
import Requests from './pages/Requests';
import RequestDetail from './pages/RequestDetail';
import Tasks from './pages/Tasks';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import Organization from './pages/Organization';
import Categories from './pages/Categories';
import Workflows from './pages/Workflows';
import AuditLogs from './pages/AuditLogs';
import AssetHistories from './pages/AssetHistories';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Loading text="Đang khôi phục phiên đăng nhập…" />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

/**
 * Chan truy cap theo vai tro ngay tai router. Day chi la lop bao ve giao dien
 * cho do kho chiu - backend van la noi quyet dinh cuoi cung bang @PreAuthorize.
 */
function RequireRole({ roles, children }) {
  const { hasRole } = useAuth();
  if (!hasRole(...roles)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route
            element={
              <Protected>
                <Layout />
              </Protected>
            }
          >
            <Route path="/" element={<Dashboard />} />
            <Route path="/assets" element={<Assets />} />
            <Route path="/assets/:id" element={<AssetDetail />} />

            <Route path="/requests" element={<Requests key="mine" scope="mine" />} />
            <Route
              path="/requests/all"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR']}>
                  <Requests key="all" scope="all" />
                </RequireRole>
              }
            />
            <Route path="/requests/:id" element={<RequestDetail />} />
            <Route
              path="/tasks"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR']}>
                  <Tasks />
                </RequireRole>
              }
            />

            <Route path="/notifications" element={<Notifications />} />

            <Route
              path="/admin/users"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR']}>
                  <Users />
                </RequireRole>
              }
            />
            <Route
              path="/admin/organization"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR', 'ADMIN']}>
                  <Organization />
                </RequireRole>
              }
            />
            <Route
              path="/admin/categories"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR', 'ADMIN']}>
                  <Categories />
                </RequireRole>
              }
            />
            <Route
              path="/admin/workflows"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR', 'ADMIN']}>
                  <Workflows />
                </RequireRole>
              }
            />
            <Route
              path="/audit-logs"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR', 'ADMIN']}>
                  <AuditLogs />
                </RequireRole>
              }
            />
            <Route
              path="/asset-histories"
              element={
                <RequireRole roles={['MANAGER', 'DIRECTOR']}>
                  <AssetHistories />
                </RequireRole>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

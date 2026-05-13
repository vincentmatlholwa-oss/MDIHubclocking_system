import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const isEmployeeApp = import.meta.env.VITE_APP_MODE === 'employee';

export function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!isEmployeeApp && user.role === 'employee') {
    return <Navigate to="/login" replace />;
  }
  if (adminOnly && user.role !== 'admin' && user.role !== 'manager') {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
}

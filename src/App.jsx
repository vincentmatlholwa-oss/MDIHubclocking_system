import { useState, useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AppProvider } from './contexts/AppContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Attendance } from './pages/Attendance';
import { Leave } from './pages/Leave';
import { NotificationPanel } from './components/NotificationPanel';
import { initDB, seedInitialData } from './services/db';
import { requestNotificationPermission } from './services/notifications';

const isEmployeeApp = import.meta.env.VITE_APP_MODE === 'employee';

const AdminDashboard = isEmployeeApp
  ? () => null
  : lazy(() => import('./pages/AdminDashboard'));
const Employees = isEmployeeApp
  ? () => null
  : lazy(() => import('./pages/Employees'));
const Reports = isEmployeeApp
  ? () => null
  : lazy(() => import('./pages/Reports'));

function AdminPlaceholder() { return null; }

function AppContent() {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState(null);

  useEffect(() => {
    async function init() {
      try {
        await initDB();
        await seedInitialData();
        requestNotificationPermission();
        setReady(true);
      } catch (e) {
        console.error('Init error:', e);
        setInitError(e.message);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const loadingEl = document.getElementById('loading');
    if (loadingEl) loadingEl.style.display = 'none';
  }, [ready]);

  if (initError) {
    return (
      <div className="error-screen">
        <div className="error-icon">⚠️</div>
        <h2>Initialization Error</h2>
        <p>{initError}</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary">
          Retry
        </button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="loading-screen">
        <div className="spinner-large" />
        <p>Initializing MDIHub...</p>
      </div>
    );
  }

  const Admin = isEmployeeApp ? AdminPlaceholder : AdminDashboard;
  const EmpPage = isEmployeeApp ? AdminPlaceholder : Employees;
  const RepPage = isEmployeeApp ? AdminPlaceholder : Reports;

  return (
    <BrowserRouter>
      <AuthProvider>
        <AppProvider>
          <Suspense fallback={<div className="loading-screen"><div className="spinner-large" /></div>}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<Layout />}>
                <Route path="/dashboard" element={
                  <ProtectedRoute><Dashboard /></ProtectedRoute>
                } />
                <Route path="/attendance" element={
                  <ProtectedRoute><Attendance /></ProtectedRoute>
                } />
                <Route path="/leave" element={
                  <ProtectedRoute><Leave /></ProtectedRoute>
                } />
                <Route path="/notifications" element={
                  <ProtectedRoute><NotificationPanel /></ProtectedRoute>
                } />
                <Route path="/admin" element={
                  <ProtectedRoute adminOnly><Admin /></ProtectedRoute>
                } />
                <Route path="/employees" element={
                  <ProtectedRoute adminOnly><EmpPage /></ProtectedRoute>
                } />
                <Route path="/reports" element={
                  <ProtectedRoute adminOnly><RepPage /></ProtectedRoute>
                } />
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
          </Suspense>
        </AppProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default function App() {
  return <AppContent />;
}

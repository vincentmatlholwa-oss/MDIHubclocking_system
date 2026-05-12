import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { SyncIndicator } from './SyncIndicator';

export function Layout() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  if (isLogin) return <Outlet />;

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <SyncIndicator />
        <Outlet />
      </main>
      <footer className="app-footer">
        MDIHub &copy; {new Date().getFullYear()} Vincent Matlholwa. All rights reserved.
      </footer>
    </div>
  );
}

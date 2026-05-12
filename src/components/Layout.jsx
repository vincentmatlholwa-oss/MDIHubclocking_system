import { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from './Navbar';
import { SyncIndicator } from './SyncIndicator';
import { TutorialOverlay } from './TutorialOverlay';

export function Layout() {
  const location = useLocation();
  const isLogin = location.pathname === '/login';
  const [tutorialVisible, setTutorialVisible] = useState(false);

  useEffect(() => {
    if (!isLogin && !localStorage.getItem('mdihub_tutorial_seen')) {
      setTutorialVisible(true);
    }
  }, [isLogin]);

  if (isLogin) return <Outlet />;

  return (
    <div className="app-layout">
      <Navbar onShowTutorial={() => setTutorialVisible(true)} />
      <main className="main-content">
        <SyncIndicator />
        <Outlet />
      </main>
      <footer className="app-footer">
        MDIHub &copy; {new Date().getFullYear()} Vincent Matlholwa. All rights reserved.
      </footer>
      {tutorialVisible && <TutorialOverlay onClose={() => setTutorialVisible(false)} />}
    </div>
  );
}

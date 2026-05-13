import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

const isEmployeeApp = import.meta.env.VITE_APP_MODE === 'employee';

export function Navbar({ onShowTutorial }) {
  const { user, logout, isAdmin } = useAuth();
  const { unreadCount, isOnline } = useApp();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = () => {
    setMenuOpen(false);
    logout();
    navigate('/login');
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <img src="/icons/logo.png" alt="MDIHub" className="navbar-logo-img" />
      </div>

      <div className="navbar-center">
        <span className="navbar-title">MDIHub</span>
      </div>

      <div className="navbar-right" ref={menuRef}>
        <span className={`online-dot ${isOnline ? 'online' : 'offline'}`} />
        <div className="user-badge">
          <span className="user-initials">{user?.name?.charAt(0) || 'U'}</span>
        </div>
        <button className="navbar-hamburger" onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
          <span className={`hamburger-icon ${menuOpen ? 'open' : ''}`}>
            <span /><span /><span />
          </span>
        </button>

        {menuOpen && (
          <div className="navbar-dropdown dropdown-right">
            <div className="dropdown-header">
              <span className="dropdown-user">{user?.name}</span>
              <span className="dropdown-role">{user?.role}</span>
              <span className="dropdown-email">{user?.email}</span>
            </div>

            <NavLink to="/dashboard" className="dropdown-item dropdown-nav-link" onClick={closeMenu}>
              <span>⏰</span> Dashboard
            </NavLink>
            <NavLink to="/attendance" className="dropdown-item dropdown-nav-link" onClick={closeMenu}>
              <span>📋</span> Attendance
            </NavLink>
            <NavLink to="/leave" className="dropdown-item dropdown-nav-link" onClick={closeMenu}>
              <span>📅</span> Leave
            </NavLink>
            <NavLink to="/notifications" className="dropdown-item dropdown-nav-link" onClick={closeMenu}>
              <span>🔔</span> Alerts
              {unreadCount > 0 && <span className="badge badge-count badge-dropdown">{unreadCount}</span>}
            </NavLink>
            {!isEmployeeApp && isAdmin && (
              <NavLink to="/admin" className="dropdown-item dropdown-nav-link" onClick={closeMenu}>
                <span>⚙️</span> Admin
              </NavLink>
            )}

            <div className="dropdown-divider" />

            <button className="dropdown-item" onClick={() => { closeMenu(); alert(`Employee ID: ${user?.employeeId}\nDepartment: ${user?.department}\nEmail: ${user?.email}`); }}>
              <span>👤</span> Profile
            </button>
            <button className="dropdown-item" onClick={() => { closeMenu(); onShowTutorial && onShowTutorial(); }}>
              <span>💡</span> Help & Tips
            </button>
            <button className="dropdown-item" onClick={() => { closeMenu(); alert(`MDIHub v3.0.0\nMafikeng Digital Innovation Hub\nClocking System\n\n© Vincent Matlholwa`); }}>
              <span>ℹ️</span> About
            </button>

            <div className="dropdown-divider" />
            <button className="dropdown-item dropdown-logout" onClick={handleLogout}>
              <span>🚪</span> Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

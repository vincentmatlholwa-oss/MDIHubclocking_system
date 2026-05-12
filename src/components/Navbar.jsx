import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';

const isEmployeeApp = import.meta.env.VITE_APP_MODE === 'employee';

export function Navbar() {
  const { user, logout, isAdmin } = useAuth();
  const { unreadCount, isOnline } = useApp();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <span className="navbar-logo">MDIHub</span>
        <span className={`online-dot ${isOnline ? 'online' : 'offline'}`} />
      </div>

      <div className="navbar-links">
        <NavLink to="/dashboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">⏰</span>
          <span className="nav-label">Dashboard</span>
        </NavLink>
        <NavLink to="/attendance" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">Attendance</span>
        </NavLink>
        <NavLink to="/leave" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">📅</span>
          <span className="nav-label">Leave</span>
        </NavLink>
        <NavLink to="/notifications" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <span className="nav-icon">🔔</span>
          {unreadCount > 0 && <span className="badge badge-count">{unreadCount}</span>}
          <span className="nav-label">Alerts</span>
        </NavLink>
        {!isEmployeeApp && isAdmin && (
          <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label">Admin</span>
          </NavLink>
        )}
      </div>

      <div className="navbar-right">
        <div className="user-badge">
          <span className="user-initials">{user?.name?.charAt(0) || 'U'}</span>
        </div>
        <button onClick={handleLogout} className="btn-logout" title="Logout">
          <span>⏻</span>
        </button>
      </div>
    </nav>
  );
}

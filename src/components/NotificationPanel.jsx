import { useNavigate } from 'react-router-dom';
import { useApp } from '../contexts/AppContext';
import { markNotificationRead, markAllNotificationsRead } from '../services/notifications';
import { useAuth } from '../contexts/AuthContext';

export function NotificationPanel() {
  const { notifications, loadNotifications } = useApp();
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleMarkRead = async (id) => {
    await markNotificationRead(id);
    loadNotifications();
  };

  const handleMarkAllRead = async () => {
    if (!user) return;
    await markAllNotificationsRead(user.employeeId);
    loadNotifications();
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>Notifications</h1>
        {notifications.some(n => !n.read) && (
          <button onClick={handleMarkAllRead} className="btn btn-sm btn-outline">
            Mark All Read
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🔔</div>
          <p>No notifications</p>
        </div>
      ) : (
        <div className="notification-list">
          {notifications.map(n => (
            <div key={n.id} className={`notification-item ${!n.read ? 'unread' : ''}`}
              onClick={() => handleMarkRead(n.id)}>
              <div className="notif-icon">
                {n.type === 'leave_approved' && '✅'}
                {n.type === 'leave_rejected' && '❌'}
                {n.type === 'leave_requested' && '📋'}
                {n.type === 'late_clockin' && '⏰'}
                {n.type === 'late_approved' && '👍'}
                {n.type === 'break_reminder' && '☕'}
                {n.type === 'missed_clockout' && '⚠️'}
                {n.type === 'employee_late_request' && '🕐'}
              </div>
              <div className="notif-content">
                <div className="notif-title">{n.title}</div>
                <div className="notif-message">{n.message}</div>
                <div className="notif-time">
                  {new Date(n.createdAt).toLocaleString('en-ZA')}
                </div>
              </div>
              {!n.read && <div className="notif-unread-dot" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

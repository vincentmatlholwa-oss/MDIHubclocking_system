import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { ClockInButton } from '../components/ClockInButton';
import { useClock } from '../hooks/useClock';
import { BREAKS, WORK_HOURS, GEOFENCE } from '../utils/constants';
import { getActiveBreak } from '../utils/helpers';

export function Dashboard() {
  const { user } = useAuth();
  const { todayAttendance, currentTime, isOnline } = useApp();
  const { dateStr } = useClock();
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = currentTime.getHours();
    if (h < 12) setGreeting('Good Morning');
    else if (h < 17) setGreeting('Good Afternoon');
    else setGreeting('Good Evening');
  }, [currentTime]);

  const activeBreak = getActiveBreak();

  const getStatusInfo = () => {
    if (!todayAttendance || !todayAttendance.clockIn) return { value: 'Not Clocked In', icon: '⚪', class: '' };
    if (todayAttendance.late) return { value: 'Late', icon: '🟡', class: 'stat-warn' };
    if (todayAttendance.clockOut) return { value: 'Clocked Out', icon: '🔴', class: 'stat-clocked-out' };
    if (todayAttendance.breakStart && !todayAttendance.breakEnd) return { value: 'On Break', icon: '☕', class: 'stat-break' };
    return { value: 'Clocked In', icon: '🟢', class: 'stat-active' };
  };

  const statusInfo = getStatusInfo();

  const stats = [
    {
      label: 'Status',
      value: statusInfo.value,
      icon: statusInfo.icon,
      className: statusInfo.class
    },
    {
      label: 'Clock In',
      value: todayAttendance?.clockIn
        ? new Date(todayAttendance.clockIn).toLocaleTimeString()
        : '--:--',
      icon: '⏰'
    },
    {
      label: 'Clock Out',
      value: todayAttendance?.clockOut
        ? new Date(todayAttendance.clockOut).toLocaleTimeString()
        : '--:--',
      icon: '🚪'
    },
    {
      label: 'Hours Today',
      value: todayAttendance?.totalHours
        ? `${todayAttendance.totalHours.toFixed(2)}h`
        : '0.00h',
      icon: '📊'
    },
    {
      label: 'Location',
      value: todayAttendance?.location?.address
        ? todayAttendance.location.address.split(',')[0]
        : GEOFENCE.label,
      icon: '📍'
    }
  ];

  return (
    <div className="page">
      <div className="dashboard-header">
        <div>
          <h1 className="greeting">{greeting}, {user?.name}!</h1>
          <p className="text-muted">{dateStr}</p>
        </div>
        <div className="connection-badge">
          <span className={`online-dot ${isOnline ? 'online' : 'offline'}`} />
          {isOnline ? 'Connected' : 'Offline Mode'}
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="card clock-card">
          <div className="card-body text-center">
            <div className="live-time">
              {currentTime.toLocaleTimeString()}
            </div>
            <ClockInButton />
          </div>
        </div>

        <div className="card stats-card">
          <div className="card-header">
            <h3>Today's Overview</h3>
          </div>
          <div className="card-body">
            <div className="stats-grid">
              {stats.map((s, i) => (
                <div key={i} className={`stat-item ${s.className || ''}`}>
                  <span className="stat-icon">{s.icon}</span>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value">{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="card schedule-card">
          <div className="card-header">
            <h3>Today's Schedule</h3>
          </div>
          <div className="card-body">
            <div className="schedule-list">
              <div className="schedule-item">
                <span className="schedule-time">08:00</span>
                <span className="schedule-dot start" />
                <span className="schedule-label">Work Start</span>
              </div>
              <div className="schedule-item">
                <span className="schedule-time">08:30</span>
                <span className="schedule-dot deadline" />
                <span className="schedule-label">Late Threshold</span>
              </div>
              <div className="schedule-item">
                <span className="schedule-time">10:00 - 10:30</span>
                <span className="schedule-dot break" />
                <span className="schedule-label">Tea Break</span>
              </div>
              <div className="schedule-item">
                <span className="schedule-time">13:00 - 14:00</span>
                <span className="schedule-dot lunch" />
                <span className="schedule-label">Lunch Break</span>
              </div>
              <div className="schedule-item">
                <span className="schedule-time">16:30</span>
                <span className="schedule-dot end" />
                <span className="schedule-label">Work End</span>
              </div>
            </div>
          </div>
        </div>

        <div className="card info-card">
          <div className="card-header">
            <h3>Quick Info</h3>
          </div>
          <div className="card-body">
            <div className="info-list">
              <div className="info-row">
                <span className="info-label">Employee ID</span>
                <span className="info-value">{user?.employeeId}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Department</span>
                <span className="info-value">{user?.department}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Role</span>
                <span className="info-value capitalize">{user?.role}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Work Hours</span>
                <span className="info-value">{WORK_HOURS.start} - {WORK_HOURS.end}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Geofence</span>
                <span className="info-value">{GEOFENCE.label} ({GEOFENCE.radiusMeters}m)</span>
              </div>
              {todayAttendance?.late && (
                <div className="info-row">
                  <span className="info-label">Status</span>
                  <span className="info-value" style={{color: '#fcd34d', fontWeight: 600}}>Flagged Late</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

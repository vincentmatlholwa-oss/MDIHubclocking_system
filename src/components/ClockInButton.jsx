import { useState } from 'react';
import { useApp } from '../contexts/AppContext';
import { getActiveBreak } from '../utils/helpers';

export function ClockInButton() {
  const { todayAttendance, clockIn, clockOut, startBreak, endBreak, currentTime } = useApp();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const activeBreak = getActiveBreak();

  const handleAction = async (action) => {
    setLoading(true);
    setMessage(null);

    if (action === 'clock_in') {
      const result = await clockIn();
      if (!result.success) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.late ? 'Clocked in (Late)' : 'Successfully clocked in!' });
      }
    } else if (action === 'clock_out') {
      const result = await clockOut();
      if (result.success) {
        setMessage({ type: 'success', text: 'Successfully clocked out!' });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } else if (action === 'start_break') {
      const result = await startBreak();
      if (result.success) {
        setMessage({ type: 'success', text: 'Break started' });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    } else if (action === 'end_break') {
      const result = await endBreak();
      if (result.success) {
        setMessage({ type: 'success', text: 'Break ended' });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    }

    setLoading(false);
    if (message?.type === 'success') {
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const renderButton = (action, label, icon, cls = '') => {
    return (
      <button
        onClick={() => handleAction(action)}
        disabled={loading}
        className={`btn btn-lg ${cls}`}
      >
        {loading ? <span className="spinner-sm" /> : <span className="btn-icon">{icon}</span>}
        {label}
      </button>
    );
  };

  if (!todayAttendance) {
    return (
      <div className="clock-in-section">
        {message && <div className={`alert alert-${message.type}`}>{message.text}</div>}
        <div className="clock-time">{currentTime.toLocaleTimeString()}</div>
        {renderButton('clock_in', 'Clock In', '⏰', 'btn-primary')}
      </div>
    );
  }

  if (todayAttendance.clockIn && !todayAttendance.breakStart && !todayAttendance.clockOut) {
    return (
      <div className="clock-in-section">
        <div className="clock-status">
          <span className={`status-dot ${todayAttendance.late ? 'warning' : 'active'}`} />
          {todayAttendance.late ? (
            <span style={{color: '#fcd34d', fontWeight: 600}}>Clocked In (Late)</span>
          ) : (
            <>Clocked In at {new Date(todayAttendance.clockIn).toLocaleTimeString()}</>
          )}
        </div>
        {activeBreak && (
          <div className="break-notice">
            ☕ {activeBreak.label} time ({activeBreak.start} - {activeBreak.end})
          </div>
        )}
        <div className="clock-actions">
          {renderButton('start_break', 'Start Break', '☕', 'btn-warning')}
          {renderButton('clock_out', 'Clock Out', '🚪', 'btn-danger')}
        </div>
      </div>
    );
  }

  if (todayAttendance.breakStart && !todayAttendance.breakEnd) {
    return (
      <div className="clock-in-section">
        <div className="clock-status">
          <span className="status-dot break" /> On Break (since {new Date(todayAttendance.breakStart).toLocaleTimeString()})
        </div>
        {renderButton('end_break', 'End Break', '🔄', 'btn-success')}
      </div>
    );
  }

  if (todayAttendance.clockIn && todayAttendance.breakEnd && !todayAttendance.clockOut) {
    return (
      <div className="clock-in-section">
        <div className="clock-status">
          <span className="status-dot active" /> Clocked In
        </div>
        <div className="clock-info">
          Break: {new Date(todayAttendance.breakStart).toLocaleTimeString()} - {new Date(todayAttendance.breakEnd).toLocaleTimeString()}
        </div>
        {renderButton('clock_out', 'Clock Out', '🚪', 'btn-danger')}
      </div>
    );
  }

  if (todayAttendance.clockOut) {
    return (
      <div className="clock-in-section">
        <div className="clock-status">
          <span className="status-dot inactive" /> Clocked Out at {new Date(todayAttendance.clockOut).toLocaleTimeString()}
        </div>
        <div className="clock-info">
          Total Hours: {todayAttendance.totalHours?.toFixed(2) || '0.00'}h
        </div>
      </div>
    );
  }

  return null;
}



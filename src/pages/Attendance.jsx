import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { useNavigate } from 'react-router-dom';
import { STORES } from '../utils/constants';
import { getAll, getByIndex } from '../services/db';
import { formatDisplayDate, formatDisplayTime, calculateHours } from '../utils/helpers';

export function Attendance() {
  const { user } = useAuth();
  const { todayAttendance, loadTodayAttendance } = useApp();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0, present: 0, late: 0, absent: 0, totalHours: 0
  });

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const allRecords = await getByIndex(STORES.attendance, 'employeeId', user.employeeId);
      const sorted = allRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
      setRecords(sorted);

      const stats = {
        total: sorted.length,
        present: sorted.filter(r => r.status === 'clocked_out' || r.status === 'present').length,
        late: sorted.filter(r => r.late || r.status === 'late').length,
        absent: sorted.filter(r => r.status === 'absent').length,
        totalHours: sorted.reduce((sum, r) => sum + (r.totalHours || 0), 0)
      };
      setStats(stats);
    } catch (e) {
      console.error('Load attendance error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadRecords();
    loadTodayAttendance();
  }, [loadRecords, loadTodayAttendance]);

  const filteredRecords = filter === 'all'
    ? records
    : records.filter(r => {
        if (filter === 'late') return r.late || r.status === 'late';
        if (filter === 'present') return r.status === 'clocked_out' || r.status === 'present';
        if (filter === 'absent') return r.status === 'absent';
        return true;
      });

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const monthRecords = records.filter(r => {
    const d = new Date(r.date);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Attendance</h1>
          <p className="text-muted">Your attendance history and records</p>
        </div>
        <button onClick={loadRecords} className="btn btn-sm btn-outline">
          Refresh
        </button>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{stats.total}</div>
          <div className="stat-label">Total Days</div>
        </div>
        <div className="stat-card stat-good">
          <div className="stat-number">{stats.present}</div>
          <div className="stat-label">Present</div>
        </div>
        <div className="stat-card stat-warn">
          <div className="stat-number">{stats.late}</div>
          <div className="stat-label">Late</div>
        </div>
        <div className="stat-card stat-info">
          <div className="stat-number">{stats.totalHours.toFixed(1)}</div>
          <div className="stat-label">Total Hours</div>
        </div>
        <div className="stat-card stat-bad">
          <div className="stat-number">{stats.absent}</div>
          <div className="stat-label">Absent</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>History</h3>
          <div className="filter-tabs">
            {['all', 'present', 'late', 'absent'].map(f => (
              <button
                key={f}
                className={`tab-sm ${filter === f ? 'active' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4"><span className="spinner" /></div>
          ) : filteredRecords.length === 0 ? (
            <div className="empty-state">
              <p>No attendance records found</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Clock In</th>
                    <th>Clock Out</th>
                    <th>Status</th>
                    <th>Hours</th>
                    <th>Location</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map(r => (
                    <tr key={r.id} className={r.late && !r.lateApproved ? 'row-late' : ''}>
                      <td>{formatDisplayDate(new Date(r.date))}</td>
                      <td>{r.clockIn ? formatDisplayTime(new Date(r.clockIn)) : '--'}</td>
                      <td>{r.clockOut ? formatDisplayTime(new Date(r.clockOut)) : r.status === 'clocked_in' ? <span className="badge-warning">In Progress</span> : '--'}</td>
                      <td>
                        <span className={`badge ${r.late && !r.lateApproved ? 'badge-danger' : r.clockOut ? 'badge-success' : r.clockIn ? 'badge-warning' : 'badge-secondary'}`}>
                          {r.late && !r.lateApproved ? 'Late' : r.clockOut ? 'Present' : r.clockIn ? 'Active' : 'Absent'}
                        </span>
                      </td>
                      <td>{r.totalHours ? `${r.totalHours.toFixed(2)}h` : '--'}</td>
                      <td className="text-truncate" title={r.location?.address}>
                        {r.location?.address?.split(',')[0] || 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

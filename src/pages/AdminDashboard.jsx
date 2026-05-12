import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { STORES, LEAVE_TYPES } from '../utils/constants';
import { getAll, put, get, getAttendanceByDate } from '../services/db';
import { formatDisplayDate, formatDisplayTime, today, now, formatDate } from '../utils/helpers';
import { createNotification } from '../services/notifications';
import { syncAll } from '../services/sync';

export function AdminDashboard() {
  const { user } = useAuth();
  const [todayAttendance, setTodayAttendance] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [pendingLeave, setPendingLeave] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const users = await getAll(STORES.users);
      setAllUsers(users);

      const allAttendance = await getAll(STORES.attendance);
      const todayRecords = allAttendance.filter(a => a.date === today()).reverse();
      setTodayAttendance(todayRecords);

      const allLeave = await getAll(STORES.leaveRequests);
      const pending = allLeave.filter(l => l.status === 'pending');
      setPendingLeave(pending);
    } catch (e) {
      console.error('Admin load error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleLeaveAction = async (leaveId, action) => {
    try {
      const leave = await get(STORES.leaveRequests, leaveId);
      if (!leave) return;
      leave.status = action;
      leave.approvedBy = user.employeeId;
      leave.synced = false;
      await put(STORES.leaveRequests, leave);
      await createNotification({
        userId: leave.employeeId,
        title: action === 'approved' ? 'Leave Approved' : 'Leave Rejected',
        message: `Your ${LEAVE_TYPES[leave.type]?.label || leave.type} request (${leave.startDate} to ${leave.endDate}) has been ${action}.`,
        type: action === 'approved' ? 'leave_approved' : 'leave_rejected',
        relatedId: leave.id
      });
      await syncAll();
      loadData();
    } catch (e) {
      console.error('Leave action error:', e);
    }
  };

  const employees = allUsers.filter(u => u.role === 'employee' || u.role === 'manager');

  const getEmployeeStatus = (empId) => {
    const record = todayAttendance.find(a => a.employeeId === empId);
    if (!record) return { status: 'not_clocked', label: 'Not Clocked In', icon: '⚪' };
    if (record.late) return { status: 'late', label: 'Late', icon: '🟡' };
    if (record.clockOut) return { status: 'clocked_out', label: 'Clocked Out', icon: '🔴' };
    if (record.breakStart && !record.breakEnd) return { status: 'on_break', label: 'On Break', icon: '☕' };
    if (record.clockIn) return { status: 'clocked_in', label: 'Clocked In', icon: '🟢' };
    return { status: 'not_clocked', label: 'Not Clocked In', icon: '⚪' };
  };

  const grouped = { not_clocked: [], clocked_in: [], late: [], clocked_out: [], on_break: [] };
  for (const emp of employees) {
    const st = getEmployeeStatus(emp.employeeId);
    if (st.status === 'late') {
      grouped.late.push({ ...emp, status: st });
    } else if (st.status === 'clocked_in') {
      grouped.clocked_in.push({ ...emp, status: st });
    } else if (st.status === 'on_break') {
      grouped.on_break.push({ ...emp, status: st });
    } else if (st.status === 'clocked_out') {
      grouped.clocked_out.push({ ...emp, status: st });
    } else {
      grouped.not_clocked.push({ ...emp, status: st });
    }
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <button onClick={loadData} className="btn btn-sm btn-outline">Refresh</button>
      </div>

      <div className="tabs">
        {['overview', 'live', 'leave'].map(tab => (
          <button key={tab} className={`tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab)}>
            {tab === 'overview' && 'Overview'}
            {tab === 'live' && 'Live Status'}
            {tab === 'leave' && `Leave (${pendingLeave.length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center p-4"><span className="spinner" /></div>
      ) : activeTab === 'overview' ? (
        <>
          <div className="stats-row">
            <div className="stat-card">
              <div className="stat-number">{employees.length}</div>
              <div className="stat-label">Employees</div>
            </div>
            <div className="stat-card stat-good">
              <div className="stat-number">{grouped.clocked_in.length + grouped.on_break.length}</div>
              <div className="stat-label">Active Now</div>
            </div>
            <div className="stat-card stat-warn">
              <div className="stat-number">{grouped.late.length}</div>
              <div className="stat-label">Late</div>
            </div>
            <div className="stat-card stat-bad">
              <div className="stat-number">{grouped.not_clocked.length}</div>
              <div className="stat-label">Not Clocked In</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{grouped.clocked_out.length}</div>
              <div className="stat-label">Clocked Out</div>
            </div>
          </div>

          <div className="employee-status-grid">
            <div className="status-column" style={{borderLeft: '3px solid #fca5a5'}}>
              <h4>🔴 Not Clocked In <span className="status-count badge badge-danger">{grouped.not_clocked.length}</span></h4>
              {grouped.not_clocked.length === 0 ? (
                <p style={{color: 'var(--text-muted)', fontSize: '0.8125rem'}}>All employees clocked in</p>
              ) : grouped.not_clocked.map(emp => (
                <div key={emp.id} className="status-employee">
                  <span>{emp.name}</span>
                  <code>{emp.employeeId}</code>
                </div>
              ))}
            </div>

            <div className="status-column" style={{borderLeft: '3px solid #6ee7b7'}}>
              <h4>🟢 Clocked In <span className="status-count badge badge-success">{grouped.clocked_in.length + grouped.on_break.length}</span></h4>
              {grouped.clocked_in.concat(grouped.on_break).length === 0 ? (
                <p style={{color: 'var(--text-muted)', fontSize: '0.8125rem'}}>No one clocked in</p>
              ) : [...grouped.clocked_in, ...grouped.on_break].map(emp => {
                const rec = todayAttendance.find(a => a.employeeId === emp.employeeId);
                return (
                  <div key={emp.id} className="status-employee">
                    <span>
                      {emp.name}
                      {emp.status.status === 'on_break' && <span className="badge badge-warning" style={{marginLeft: '0.375rem', fontSize: '0.6875rem'}}>Break</span>}
                    </span>
                    <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                      {rec?.clockIn ? formatDisplayTime(new Date(rec.clockIn)) : ''}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="status-column" style={{borderLeft: '3px solid #fcd34d'}}>
              <h4>🟡 Late <span className="status-count badge badge-warning">{grouped.late.length}</span></h4>
              {grouped.late.length === 0 ? (
                <p style={{color: 'var(--text-muted)', fontSize: '0.8125rem'}}>No late clock-ins</p>
              ) : grouped.late.map(emp => {
                const rec = todayAttendance.find(a => a.employeeId === emp.employeeId);
                return (
                  <div key={emp.id} className="status-employee">
                    <span>{emp.name}</span>
                    <span style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>
                      {rec?.clockIn ? formatDisplayTime(new Date(rec.clockIn)) : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h3>Today's Attendance</h3>
            </div>
            <div className="card-body p-0">
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Employee</th>
                      <th>ID</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Status</th>
                      <th>Location</th>
                      <th>Hours</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAttendance.length === 0 ? (
                      <tr><td colSpan={7} className="text-center">No records today</td></tr>
                    ) : todayAttendance.map(r => (
                      <tr key={r.id} className={r.late ? 'row-late' : ''}>
                        <td>{r.employeeName || r.employeeId}</td>
                        <td><code>{r.employeeId}</code></td>
                        <td>{r.clockIn ? formatDisplayTime(new Date(r.clockIn)) : '--'}</td>
                        <td>{r.clockOut ? formatDisplayTime(new Date(r.clockOut)) : <span className="badge badge-warning">Active</span>}</td>
                        <td>
                          {r.late ? <span className="badge badge-warning">Late</span> :
                           r.clockOut ? <span className="badge badge-success">Present</span> :
                           r.clockIn ? <span className="badge badge-warning">Active</span> :
                           <span className="badge badge-secondary">Absent</span>}
                        </td>
                        <td className="text-truncate" title={r.location?.address}>
                          {r.location?.address?.split(',')[0] || 'N/A'}
                        </td>
                        <td>{r.totalHours ? `${r.totalHours.toFixed(1)}h` : '--'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : activeTab === 'live' ? (
        <div className="employee-status-grid">
          <div className="status-column" style={{borderLeft: '3px solid #fca5a5'}}>
            <h4>🔴 Not Clocked In <span className="badge badge-danger">{grouped.not_clocked.length}</span></h4>
            {grouped.not_clocked.map(emp => (
              <div key={emp.id} className="status-employee">
                <span>{emp.name}</span>
                <code>{emp.employeeId}</code>
              </div>
            ))}
            {grouped.not_clocked.length === 0 && <p style={{color:'var(--text-muted)',fontSize:'0.8125rem'}}>All employees are in</p>}
          </div>
          <div className="status-column" style={{borderLeft: '3px solid #6ee7b7'}}>
            <h4>🟢 Clocked In <span className="badge badge-success">{grouped.clocked_in.length}</span></h4>
            {grouped.clocked_in.map(emp => {
              const rec = todayAttendance.find(a => a.employeeId === emp.employeeId);
              return <div key={emp.id} className="status-employee">
                <span>{emp.name}</span>
                <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{rec?.clockIn ? formatDisplayTime(new Date(rec.clockIn)) : ''}</span>
              </div>;
            })}
            {grouped.clocked_in.length === 0 && <p style={{color:'var(--text-muted)',fontSize:'0.8125rem'}}>No employees clocked in</p>}
          </div>
          <div className="status-column" style={{borderLeft: '3px solid #fcd34d'}}>
            <h4>🟡 Late & On Break</h4>
            <div style={{marginTop:'0.5rem'}}>
              <p style={{fontSize:'0.8125rem',color:'var(--text-muted)',marginBottom:'0.375rem'}}>Late:</p>
              {grouped.late.map(emp => {
                const rec = todayAttendance.find(a => a.employeeId === emp.employeeId);
                return <div key={emp.id} className="status-employee">
                  <span>{emp.name}</span>
                  <span style={{fontSize:'0.75rem',color:'var(--text-muted)'}}>{rec?.clockIn ? formatDisplayTime(new Date(rec.clockIn)) : ''}</span>
                </div>;
              })}
              {grouped.late.length === 0 && <p style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>No late employees</p>}
            </div>
            <div style={{marginTop:'0.5rem'}}>
              <p style={{fontSize:'0.8125rem',color:'var(--text-muted)',marginBottom:'0.375rem'}}>On Break:</p>
              {grouped.on_break.map(emp => (
                <div key={emp.id} className="status-employee">
                  <span>{emp.name} ☕</span>
                </div>
              ))}
              {grouped.on_break.length === 0 && <p style={{color:'var(--text-muted)',fontSize:'0.75rem'}}>No one on break</p>}
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-header">
            <h3>Pending Leave Requests</h3>
            <span className="badge badge-warning">{pendingLeave.length} pending</span>
          </div>
          <div className="card-body p-0">
            {pendingLeave.length === 0 ? (
              <div className="empty-state"><p>No pending leave requests</p></div>
            ) : (
              <div className="table-wrapper">
                <table className="table">
                  <thead>
                    <tr><th>Employee</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Actions</th></tr>
                  </thead>
                  <tbody>
                    {pendingLeave.map(l => (
                      <tr key={l.id}>
                        <td>{l.employeeName || l.employeeId}</td>
                        <td>{LEAVE_TYPES[l.type]?.icon} {LEAVE_TYPES[l.type]?.label || l.type}</td>
                        <td>{formatDisplayDate(new Date(l.startDate))}</td>
                        <td>{formatDisplayDate(new Date(l.endDate))}</td>
                        <td className="text-truncate" title={l.reason}>{l.reason}</td>
                        <td>
                          <div className="btn-group">
                            <button onClick={() => handleLeaveAction(l.id, 'approved')} className="btn btn-sm btn-success">Approve</button>
                            <button onClick={() => handleLeaveAction(l.id, 'rejected')} className="btn btn-sm btn-danger">Reject</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

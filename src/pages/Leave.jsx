import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApp } from '../contexts/AppContext';
import { STORES, LEAVE_TYPES, LEAVE_STATUS } from '../utils/constants';
import { getAll, getByIndex, add as dbAdd, put as dbPut } from '../services/db';
import { generateId, today, formatDisplayDate } from '../utils/helpers';
import { createNotification } from '../services/notifications';
import { syncAll } from '../services/sync';

export function Leave() {
  const { user, isAdmin } = useAuth();
  const { loadNotifications } = useApp();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    type: 'sick',
    startDate: '',
    endDate: '',
    reason: ''
  });
  const [submitting, setSubmitting] = useState(false);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getByIndex(STORES.leaveRequests, 'employeeId', user.employeeId);
      setRequests(all.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    } catch (e) {
      console.error('Load leave error:', e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) return;
    setSubmitting(true);
    try {
      const leave = {
        id: generateId(),
        employeeId: user.employeeId,
        employeeName: user.name,
        type: form.type,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason,
        status: 'pending',
        approvedBy: null,
        createdAt: new Date().toISOString(),
        synced: false
      };
      await dbAdd(STORES.leaveRequests, leave);

      const allUsers = await getAll(STORES.users);
      const admins = allUsers.filter(u => u.role === 'admin' || u.role === 'manager');
      for (const admin of admins) {
        await createNotification({
          userId: admin.employeeId,
          title: 'Leave Request',
          message: `${user.name} (${user.employeeId}) has requested ${LEAVE_TYPES[form.type]?.label || form.type} from ${form.startDate} to ${form.endDate}.`,
          type: 'leave_requested',
          relatedId: leave.id
        });
      }

      await syncAll();
      loadRequests();
      setShowForm(false);
      setForm({ type: 'sick', startDate: '', endDate: '', reason: '' });
    } catch (e) {
      console.error('Submit leave error:', e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Leave Management</h1>
          <p className="text-muted">Request and track your leave</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + New Request
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>New Leave Request</h3>
            <button onClick={() => setShowForm(false)} className="btn btn-sm btn-ghost">✕</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="leave-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Leave Type</label>
                  <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {Object.entries(LEAVE_TYPES).map(([key, val]) => (
                      <option key={key} value={key}>{val.icon} {val.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" value={form.startDate} min={today()}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input type="date" value={form.endDate} min={form.startDate || today()}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label>Reason</label>
                <textarea value={form.reason} rows={3}
                  onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="Please provide a reason for your leave request..." />
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => setShowForm(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>My Leave Requests</h3>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4"><span className="spinner" /></div>
          ) : requests.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <p>No leave requests yet</p>
            </div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>From</th>
                    <th>To</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map(r => (
                    <tr key={r.id}>
                      <td>{LEAVE_TYPES[r.type]?.icon} {LEAVE_TYPES[r.type]?.label || r.type}</td>
                      <td>{formatDisplayDate(new Date(r.startDate))}</td>
                      <td>{formatDisplayDate(new Date(r.endDate))}</td>
                      <td className="text-truncate" title={r.reason}>{r.reason}</td>
                      <td>
                        <span className={`badge ${r.status === 'approved' ? 'badge-success' : r.status === 'rejected' ? 'badge-danger' : 'badge-warning'}`}>
                          {r.status === 'approved' && '✅ '}
                          {r.status === 'rejected' && '❌ '}
                          {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                        </span>
                      </td>
                      <td>{formatDisplayDate(new Date(r.createdAt))}</td>
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

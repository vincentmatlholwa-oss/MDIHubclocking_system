import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COMPANY, GEOFENCE, STORES, LEAVE_TYPES, ROLES } from '../utils/constants';
import { validateLocation } from '../services/location';
import { add as dbAdd, getDB, getOneByIndex, getAll } from '../services/db';
import { generateId, today } from '../utils/helpers';
import { createNotification } from '../services/notifications';
import { syncAll } from '../services/sync';

const isEmployeeApp = import.meta.env.VITE_APP_MODE === 'employee';

function LoginForm({ onLogin, loading, error, employeeId, password, setEmployeeId, setPassword, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="login-form">
      <div className="form-group">
        <label>Employee ID</label>
        <input type="text" value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          placeholder="e.g. EMP001" autoFocus autoComplete="username" />
      </div>
      <div className="form-group">
        <label>Password</label>
        <input type="password" value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password" autoComplete="current-password" />
      </div>
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
        {loading ? <span className="spinner-sm" /> : 'Login'}
      </button>
    </form>
  );
}

function LeaveRequestForm({ employeeId, password, onBack }) {
  const [step, setStep] = useState('auth');
  const [authError, setAuthError] = useState('');
  const [leaveError, setLeaveError] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [leaveId, setLeaveId] = useState('');
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ type: 'sick', startDate: '', endDate: '', reason: '' });

  const handleAuth = async (e) => {
    e.preventDefault();
    const f = e.currentTarget;
    const id = (f.employeeId?.value || '').trim().toUpperCase();
    const pw = (f.password?.value || '').trim();
    if (!id || !pw) { setAuthError('Enter employee ID and password'); return; }
    setAuthLoading(true); setAuthError('');
    try {
      const db = getDB();
      const userData = await getOneByIndex(STORES.users, 'employeeId', id);
      if (!userData) throw new Error('Invalid employee ID');
      const pinMatch = userData.pin === pw;
      const pwMatch = userData.password === pw;
      if (!pinMatch && !pwMatch) throw new Error('Invalid password');
      setUser({ id: userData.id, employeeId: userData.employeeId, name: userData.name, email: userData.email, role: userData.role, department: userData.department });
      setStep('form');
    } catch (err) { setAuthError(err.message); }
    finally { setAuthLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.startDate || !form.endDate || !form.reason) { setLeaveError('Fill in all fields'); return; }
    setSubmitLoading(true); setLeaveError('');
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
        synced: false,
        source: 'login_page'
      };
      await dbAdd(STORES.leaveRequests, leave);
      setLeaveId(leave.id);
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
      setSuccess(true);
    } catch (err) { setLeaveError(err.message); }
    finally { setSubmitLoading(false); }
  };

  if (step === 'auth') {
    return (
      <form onSubmit={handleAuth} className="login-form">
        <p className="text-muted" style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
          Authenticate to submit a leave request (GPS not required)
        </p>
        <div className="form-group">
          <label>Employee ID</label>
          <input type="text" name="employeeId"
            placeholder="e.g. EMP001" autoFocus autoComplete="username" />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" name="password"
            placeholder="Enter your password" autoComplete="current-password" />
        </div>
        {authError && <div className="alert alert-error">{authError}</div>}
        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={authLoading}>
          {authLoading ? <span className="spinner-sm" /> : 'Authenticate'}
        </button>
        <button type="button" onClick={onBack} className="btn btn-ghost btn-block" style={{ marginTop: '0.5rem' }}>
          Back to Login
        </button>
      </form>
    );
  }

  if (success) {
    return (
      <div className="text-center" style={{ padding: '1rem 0' }}>
        <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
        <h3 style={{ color: 'var(--gold)', marginBottom: '0.5rem' }}>Leave Request Submitted</h3>
        <p className="text-muted">Your {form.type} leave request has been submitted for admin approval.</p>
        <p className="text-muted" style={{ fontSize: '0.8rem' }}>Reference: {leaveId}</p>
        <button onClick={onBack} className="btn btn-primary" style={{ marginTop: '1rem' }}>Back to Login</button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="login-form">
      <p className="text-muted" style={{ marginBottom: '0.75rem', textAlign: 'center' }}>
        Submit leave request as <strong>{user?.name}</strong>
      </p>
      <div className="form-group">
        <label>Leave Type</label>
        <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
          {Object.entries(LEAVE_TYPES).map(([key, val]) => (
            <option key={key} value={key}>{val.icon} {val.label} (max {val.maxDays} days)</option>
          ))}
        </select>
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
          placeholder="Provide a reason for your leave request..." />
      </div>
      {leaveError && <div className="alert alert-error">{leaveError}</div>}
      <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={submitLoading}>
        {submitLoading ? 'Submitting...' : 'Submit Request'}
      </button>
      <button type="button" onClick={() => setStep('auth')} className="btn btn-ghost btn-block" style={{ marginTop: '0.5rem' }}>
        Back
      </button>
    </form>
  );
}

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [employeeId, setEmployeeId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!employeeId || !password) {
      setError('Please enter employee ID and password');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const u = await login(employeeId.trim().toUpperCase(), password.trim());

      if (!isEmployeeApp && u.role === 'employee') {
        throw new Error('Admin access only. Please use the MDIHub Employee mobile app.');
      }

      const loc = await validateLocation();
      if (!loc.lat || !loc.lng) {
        throw new Error('Could not get your location. Please enable GPS and ensure location permission is granted, then try again.');
      }
      if (!loc.withinGeofence) {
        const dist = loc.distanceFromCenter || 0;
        throw new Error(
          `You are ${dist}m from the ${GEOFENCE.label} geofence center (max ${GEOFENCE.radiusMeters}m).\n` +
          `Your location: ${loc.lat.toFixed(6)}, ${loc.lng.toFixed(6)}\n` +
          `Expected center: ${GEOFENCE.center.lat}, ${GEOFENCE.center.lng}\n\n` +
          `Please move closer or contact admin if the geofence coordinates need updating.`
        );
      }

      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-header">
          <div className="login-logo"><img src="/icons/logo.png" alt="MDIHub" className="login-logo-img" /></div>
          <h1>{COMPANY.shortName}</h1>
          <p className="login-subtitle">{COMPANY.name}</p>
          <p className="login-subtitle">Clocking System</p>
        </div>

        <div className="tabs" style={{ marginBottom: '1rem' }}>
          <button className={`tab ${mode === 'login' ? 'active' : ''}`} onClick={() => { setMode('login'); setError(''); }}>
            🔐 Login
          </button>
          <button className={`tab ${mode === 'leave' ? 'active' : ''}`} onClick={() => { setMode('leave'); setError(''); }}>
            📋 Request Leave
          </button>
        </div>

        {mode === 'login' && (
          <>
            {error && <div className="alert alert-error">{error}</div>}
            <LoginForm
              employeeId={employeeId} password={password}
              setEmployeeId={setEmployeeId} setPassword={setPassword}
              loading={loading} error={error}
              onSubmit={handleSubmit} onLogin={() => {}}
            />
          </>
        )}

        {mode === 'leave' && (
          <LeaveRequestForm
            employeeId={employeeId}
            password={password}
            onBack={() => setMode('login')}
          />
        )}

        <div className="login-footer">
          <p>MDIHub &copy; {new Date().getFullYear()} Vincent Matlholwa. All rights reserved.</p>
          <p className="offline-badge">Works Offline</p>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { COMPANY } from '../utils/constants';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
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
      await login(employeeId.trim().toUpperCase(), password.trim());
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
          <div className="login-logo">MDIHub</div>
          <h1>{COMPANY.shortName}</h1>
          <p className="login-subtitle">{COMPANY.name}</p>
          <p className="login-subtitle">Clocking System</p>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Employee ID</label>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="e.g. EMP001"
              autoFocus
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
            {loading ? <span className="spinner-sm" /> : 'Login'}
          </button>
        </form>

        <div className="login-footer">
          <p>MDIHub &copy; {new Date().getFullYear()} Vincent Matlholwa. All rights reserved.</p>
          <p className="offline-badge">Works Offline</p>
        </div>
      </div>
    </div>
  );
}

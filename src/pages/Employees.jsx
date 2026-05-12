import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { STORES, DEPARTMENTS, ROLES } from '../utils/constants';
import { getAll, add, put } from '../services/db';
import { generateId } from '../utils/helpers';

export function Employees() {
  const { user } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    employeeId: '', name: '', email: '', pin: '1234',
    role: 'employee', department: 'Software Development', phone: ''
  });

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    try {
      const all = await getAll(STORES.users);
      setEmployees(all);
    } catch (e) {
      console.error('Load employees error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEmployees(); }, [loadEmployees]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = { ...editing, ...form };
        await put(STORES.users, updated);
      } else {
        await add(STORES.users, {
          id: generateId(),
          ...form,
          employeeId: form.employeeId.toUpperCase(),
          password: form.pin,
          createdAt: new Date().toISOString()
        });
      }
      setShowForm(false);
      setEditing(null);
      setForm({ employeeId: '', name: '', email: '', pin: '1234', role: 'employee', department: 'Software Development', phone: '' });
      loadEmployees();
    } catch (e) {
      console.error('Save employee error:', e);
    }
  };

  const handleEdit = (emp) => {
    setEditing(emp);
    setForm({
      employeeId: emp.employeeId,
      name: emp.name,
      email: emp.email,
      pin: emp.pin,
      role: emp.role,
      department: emp.department,
      phone: emp.phone || ''
    });
    setShowForm(true);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Employees</h1>
          <p className="text-muted">Manage employee accounts</p>
        </div>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn btn-primary">
            + Add Employee
          </button>
        )}
      </div>

      {showForm && (
        <div className="card mb-4">
          <div className="card-header">
            <h3>{editing ? 'Edit Employee' : 'Add Employee'}</h3>
            <button onClick={() => { setShowForm(false); setEditing(null); }} className="btn btn-sm btn-ghost">✕</button>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit} className="employee-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID</label>
                  <input type="text" value={form.employeeId} onChange={e => setForm(f => ({ ...f, employeeId: e.target.value }))}
                    placeholder="e.g. EMP004" required disabled={!!editing} />
                </div>
                <div className="form-group">
                  <label>Full Name</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@mdihub.com" required />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="081 000 0000" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>PIN</label>
                  <input type="text" value={form.pin} onChange={e => setForm(f => ({ ...f, pin: e.target.value }))}
                    placeholder="4-digit PIN" maxLength={6} required />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
                    {Object.entries(ROLES).map(([key, val]) => (
                      <option key={key} value={val}>{val.charAt(0).toUpperCase() + val.slice(1)}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))}>
                  {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="form-actions">
                <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="btn btn-outline">Cancel</button>
                <button type="submit" className="btn btn-primary">
                  {editing ? 'Update Employee' : 'Add Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3>All Employees</h3>
          <span className="badge badge-info">{employees.length} total</span>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center p-4"><span className="spinner" /></div>
          ) : (
            <div className="table-wrapper">
              <table className="table">
                <thead>
                  <tr><th>ID</th><th>Name</th><th>Email</th><th>Department</th><th>Role</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {employees.map(emp => (
                    <tr key={emp.id}>
                      <td><code>{emp.employeeId}</code></td>
                      <td>{emp.name}</td>
                      <td>{emp.email}</td>
                      <td>{emp.department}</td>
                      <td><span className="capitalize badge badge-info">{emp.role}</span></td>
                      <td>
                        <button onClick={() => handleEdit(emp)} className="btn btn-sm btn-outline">
                          Edit
                        </button>
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

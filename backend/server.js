const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
require('dotenv').config({ path: '../.env' });

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'mdihub',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const JWT_SECRET = process.env.JWT_SECRET || 'mdihub_secret_key_change_in_production';

const authenticateToken = (req, res, next) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: 'No token provided' });
  const token = auth.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

app.post('/api/login', async (req, res) => {
  try {
    const { employee_id, pin } = req.body;
    const result = await pool.query('SELECT * FROM users WHERE employee_id = $1', [employee_id]);
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const user = result.rows[0];
    const pinValid = await bcrypt.compare(pin, user.pin);
    if (!pinValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { employee_id: user.employee_id, role: user.role, user_id: user.id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        employee_id: user.employee_id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        phone: user.phone
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/clock_in', authenticateToken, async (req, res) => {
  try {
    const { timestamp, location_lat, location_lng, location_address, local_id } = req.body;
    const date = new Date(timestamp).toISOString().split('T')[0];
    const existing = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2 AND clock_out IS NULL',
      [req.user.employee_id, date]
    );
    if (existing.rows.length > 0) {
      return res.json({ success: true, server_id: existing.rows[0].id, local_id, already_exists: true });
    }
    const result = await pool.query(
      `INSERT INTO attendance (employee_id, date, clock_in, location_lat, location_lng, location_address, status, late)
       VALUES ($1, $2, $3, $4, $5, $6, 'clocked_in', $7) RETURNING id`,
      [
        req.user.employee_id, date, timestamp,
        location_lat, location_lng, location_address,
        req.body.late || false
      ]
    );
    res.json({ success: true, server_id: result.rows[0].id, local_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/clock_out', authenticateToken, async (req, res) => {
  try {
    const { timestamp, location_lat, location_lng, location_address, total_hours } = req.body;
    const result = await pool.query(
      `UPDATE attendance SET clock_out = $1, location_lat = COALESCE($2, location_lat),
       location_lng = COALESCE($3, location_lng), location_address = COALESCE($4, location_address),
       total_hours = $5, status = 'clocked_out'
       WHERE employee_id = $6 AND clock_out IS NULL AND DATE(date) = CURRENT_DATE
       RETURNING id`,
      [timestamp, location_lat, location_lng, location_address, total_hours, req.user.employee_id]
    );
    res.json({ success: true, server_id: result.rows[0]?.id || null });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/break_start', authenticateToken, async (req, res) => {
  try {
    const { timestamp } = req.body;
    await pool.query(
      `UPDATE attendance SET break_start = $1, status = 'on_break'
       WHERE employee_id = $2 AND clock_out IS NULL AND DATE(date) = CURRENT_DATE`,
      [timestamp, req.user.employee_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/break_end', authenticateToken, async (req, res) => {
  try {
    const { timestamp } = req.body;
    await pool.query(
      `UPDATE attendance SET break_end = $1, status = 'clocked_in'
       WHERE employee_id = $2 AND clock_out IS NULL AND DATE(date) = CURRENT_DATE`,
      [timestamp, req.user.employee_id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/attendance/sync', authenticateToken, async (req, res) => {
  try {
    const record = req.body;
    const date = record.date || new Date(record.clockIn).toISOString().split('T')[0];
    const existing = await pool.query(
      'SELECT id FROM attendance WHERE employee_id = $1 AND date = $2',
      [record.employeeId, date]
    );
    if (existing.rows.length > 0) {
      await pool.query(
        `UPDATE attendance SET clock_out = COALESCE($1, clock_out),
         break_start = COALESCE($2, break_start), break_end = COALESCE($3, break_end),
         total_hours = COALESCE($4, total_hours), late = $5, late_approved = $6, status = $7
         WHERE id = $8`,
        [
          record.clockOut, record.breakStart, record.breakEnd,
          record.totalHours, record.late || false, record.lateApproved || false,
          record.status, existing.rows[0].id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO attendance (employee_id, date, clock_in, clock_out, break_start, break_end,
         location_lat, location_lng, location_address, status, late, late_approved, total_hours)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          record.employeeId, date, record.clockIn, record.clockOut,
          record.breakStart, record.breakEnd,
          record.location?.lat, record.location?.lng, record.location?.address,
          record.status, record.late || false, record.lateApproved || false,
          record.totalHours
        ]
      );
    }
    res.json({ success: true, local_id: record.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leave/request', authenticateToken, async (req, res) => {
  try {
    const { type, start_date, end_date, reason } = req.body;
    const result = await pool.query(
      `INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason, status)
       VALUES ($1, $2, $3, $4, $5, 'pending') RETURNING id`,
      [req.user.employee_id, type, start_date, end_date, reason]
    );
    res.json({ success: true, id: result.rows[0].id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/leave/sync', authenticateToken, async (req, res) => {
  try {
    const record = req.body;
    const existing = await pool.query(
      'SELECT id FROM leave_requests WHERE employee_id = $1 AND start_date = $2 AND end_date = $3',
      [record.employeeId, record.startDate, record.endDate]
    );
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO leave_requests (employee_id, type, start_date, end_date, reason, status, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [record.employeeId, record.type, record.startDate, record.endDate,
         record.reason, record.status, record.createdAt]
      );
    }
    res.json({ success: true, local_id: record.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/attendance', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || new Date().toISOString().split('T')[0];
    const result = await pool.query(`
      SELECT u.employee_id, u.name, u.department, u.email, u.role,
             a.id as attendance_id, a.clock_in, a.clock_out, a.break_start, a.break_end,
             a.location_lat, a.location_lng, a.location_address,
             a.total_hours, a.late, a.late_approved, a.status
      FROM users u
      LEFT JOIN attendance a ON u.employee_id = a.employee_id AND a.date = $1
      WHERE u.role = 'employee'
      ORDER BY u.name
    `, [targetDate]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/leave/pending', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT lr.*, u.name as employee_name, u.department
       FROM leave_requests lr JOIN users u ON lr.employee_id = u.employee_id
       WHERE lr.status = 'pending' ORDER BY lr.created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/leave/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await pool.query(
      `UPDATE leave_requests SET status = $1, approved_by = $2, updated_at = NOW()
       WHERE id = $3`,
      [status, req.user.employee_id, req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/admin/attendance/:id/approve-late', authenticateToken, requireAdmin, async (req, res) => {
  try {
    await pool.query(
      `UPDATE attendance SET late_approved = true, late = false, status = 'clocked_in' WHERE id = $1`,
      [req.params.id]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/employees', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, employee_id, name, email, role, department, phone, created_at FROM users ORDER BY name'
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/admin/reports', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    const result = await pool.query(`
      SELECT a.*, u.name as employee_name, u.department
      FROM attendance a JOIN users u ON a.employee_id = u.employee_id
      WHERE a.date >= $1 AND a.date <= $2
      ORDER BY a.date DESC, u.name
    `, [from, to]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`MDIHub Backend running on http://0.0.0.0:${PORT}`);
});

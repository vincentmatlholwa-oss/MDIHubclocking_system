-- MDIHub Database Schema
-- PostgreSQL

CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    pin VARCHAR(255) NOT NULL,
    password VARCHAR(255),
    role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('employee', 'manager', 'admin')),
    department VARCHAR(100),
    phone VARCHAR(20),
    photo TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL REFERENCES users(employee_id),
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    clock_in TIMESTAMP,
    clock_out TIMESTAMP,
    break_start TIMESTAMP,
    break_end TIMESTAMP,
    location_lat DECIMAL(10, 7),
    location_lng DECIMAL(10, 7),
    location_address TEXT,
    within_geofence BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'absent' CHECK (status IN ('clocked_in', 'clocked_out', 'on_break', 'absent', 'late', 'present')),
    late BOOLEAN DEFAULT false,
    late_approved BOOLEAN DEFAULT false,
    total_hours DECIMAL(5, 2) DEFAULT 0,
    overtime DECIMAL(5, 2) DEFAULT 0,
    photo TEXT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    employee_id VARCHAR(20) NOT NULL REFERENCES users(employee_id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('sick', 'annual', 'personal')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by VARCHAR(20),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL REFERENCES users(employee_id),
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50),
    related_id INTEGER,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS login_history (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(20) NOT NULL REFERENCES users(employee_id),
    timestamp TIMESTAMP DEFAULT NOW(),
    method VARCHAR(20),
    ip_address VARCHAR(45),
    device_info TEXT,
    success BOOLEAN DEFAULT true
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date ON attendance(employee_id, date);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_status ON attendance(status);
CREATE INDEX IF NOT EXISTS idx_leave_employee ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);

-- Seed data
INSERT INTO departments (name, description) VALUES
    ('Software Development', 'Software engineering and development'),
    ('Digital Innovation', 'Digital transformation and innovation'),
    ('IT Support', 'Technical support and infrastructure'),
    ('Administration', 'Administrative services'),
    ('Human Resources', 'HR and personnel management'),
    ('Finance', 'Financial management'),
    ('Marketing', 'Marketing and communications'),
    ('Management', 'Executive management')
ON CONFLICT (name) DO NOTHING;

-- Default admin (password: admin123, PIN: 1234)
INSERT INTO users (employee_id, name, email, pin, role, department) VALUES
    ('ADM001', 'System Admin', 'admin@mdihub.com',
     '$2a$10$8K1p/a0dL1LXMIgoEDFrwOfMQkfAjkMBcGmGKOMmB4qGzAqK9QxOm',
     'admin', 'Management')
ON CONFLICT (employee_id) DO NOTHING;

export const COMPANY = {
  name: 'MDIHub - Mafikeng Digital Innovation Hub',
  shortName: 'MDIHub',
  address: 'Mafikeng, South Africa'
};

export const GEOFENCE = {
  center: { lat: -25.838889, lng: 25.631907 },
  radiusMeters: 1000,
  label: 'MDIHub'
};

export const WORK_HOURS = {
  start: '08:00',
  end: '16:30',
  lateThreshold: '08:30'
};

export const BREAKS = {
  tea: { start: '10:00', end: '10:30', label: 'Tea Break' },
  lunch: { start: '13:00', end: '14:00', label: 'Lunch Break' }
};

export const ROLES = {
  employee: 'employee',
  manager: 'manager',
  admin: 'admin'
};

export const ATTENDANCE_STATUS = {
  clockedIn: 'clocked_in',
  clockedOut: 'clocked_out',
  onBreak: 'on_break',
  absent: 'absent',
  late: 'late',
  present: 'present'
};

export const LEAVE_TYPES = {
  sick: { label: 'Sick Leave', icon: '🤒', maxDays: 30 },
  annual: { label: 'Annual Leave', icon: '🏖️', maxDays: 15 },
  personal: { label: 'Personal Leave', icon: '📋', maxDays: 5 },
  study: { label: 'Study Leave', icon: '📚', maxDays: 30 },
  family: { label: 'Family Responsibility', icon: '👨‍👩‍👧‍👦', maxDays: 5 },
  maternity: { label: 'Maternity Leave', icon: '👶', maxDays: 120 },
  paternity: { label: 'Paternity Leave', icon: '🍼', maxDays: 10 },
  unpaid: { label: 'Unpaid Leave', icon: '💰', maxDays: 30 }
};

export const LEAVE_STATUS = {
  pending: 'pending',
  approved: 'approved',
  rejected: 'rejected'
};

export const NOTIFICATION_TYPES = {
  leaveApproved: 'leave_approved',
  leaveRejected: 'leave_rejected',
  leaveRequested: 'leave_requested',
  lateClockin: 'late_clockin',
  lateApproved: 'late_approved',
  breakReminder: 'break_reminder',
  missedClockout: 'missed_clockout',
  employeeLateRequest: 'employee_late_request'
};

export const DB_NAME = 'mdihub_db';
export const DB_VERSION = 1;

export const STORES = {
  users: 'users',
  attendance: 'attendance',
  leaveRequests: 'leave_requests',
  notifications: 'notifications',
  departments: 'departments',
  syncQueue: 'sync_queue',
  loginHistory: 'login_history'
};

export const DEPARTMENTS = [
  'Software Development',
  'Digital Innovation',
  'IT Support',
  'Administration',
  'Human Resources',
  'Finance',
  'Marketing',
  'Management'
];

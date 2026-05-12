import { format, parse, differenceInMinutes, isAfter, isBefore, areIntervalsOverlapping, startOfDay, endOfDay } from 'date-fns';
import { WORK_HOURS, BREAKS } from './constants';

export function generateId() {
  return 'mdihub_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 9);
}

export function formatTime(date) {
  return format(date, 'HH:mm:ss');
}

export function formatDate(date) {
  return format(date, 'yyyy-MM-dd');
}

export function formatDateTime(date) {
  return format(date, 'yyyy-MM-dd HH:mm:ss');
}

export function formatDisplayTime(date) {
  return format(date, 'HH:mm');
}

export function formatDisplayDate(date) {
  return format(date, 'dd MMM yyyy');
}

export function today() {
  return formatDate(new Date());
}

export function now() {
  return new Date().toISOString();
}

export function getWorkStartMinutes() {
  const [h, m] = WORK_HOURS.start.split(':').map(Number);
  return h * 60 + m;
}

export function getWorkEndMinutes() {
  const [h, m] = WORK_HOURS.end.split(':').map(Number);
  return h * 60 + m;
}

export function getLateThresholdMinutes() {
  const [h, m] = WORK_HOURS.lateThreshold.split(':').map(Number);
  return h * 60 + m;
}

export function getCurrentMinutes() {
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function isLateClockIn() {
  return getCurrentMinutes() > getLateThresholdMinutes();
}

export function isBeforeWorkHours() {
  return getCurrentMinutes() < getWorkStartMinutes();
}

export function isAfterWorkHours() {
  return getCurrentMinutes() > getWorkEndMinutes();
}

export function isInBreakTime() {
  const now = getCurrentMinutes();
  for (const b of Object.values(BREAKS)) {
    const [sH, sM] = b.start.split(':').map(Number);
    const [eH, eM] = b.end.split(':').map(Number);
    const start = sH * 60 + sM;
    const end = eH * 60 + eM;
    if (now >= start && now < end) return b;
  }
  return null;
}

export function getActiveBreak() {
  const now = getCurrentMinutes();
  for (const [key, b] of Object.entries(BREAKS)) {
    const [sH, sM] = b.start.split(':').map(Number);
    const [eH, eM] = b.end.split(':').map(Number);
    const start = sH * 60 + sM;
    const end = eH * 60 + eM;
    if (now >= start - 5 && now < end) return { key, ...b };
  }
  return null;
}

export function calculateHours(clockIn, clockOut, breaks = []) {
  if (!clockIn || !clockOut) return 0;
  const start = new Date(clockIn);
  const end = new Date(clockOut);
  let totalMin = differenceInMinutes(end, start);
  for (const b of breaks) {
    if (b.start && b.end) {
      totalMin -= differenceInMinutes(new Date(b.end), new Date(b.start));
    }
  }
  return Math.max(0, totalMin / 60);
}

export function calculateOvertime(hours, standardHours = 8) {
  return Math.max(0, hours - standardHours);
}

export function isWithinGeofence(lat, lng, center, radiusMeters) {
  const R = 6371000;
  const dLat = (lat - center.lat) * Math.PI / 180;
  const dLng = (lng - center.lng) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(center.lat * Math.PI / 180) * Math.cos(lat * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c <= radiusMeters;
}

export function getStatusLabel(status) {
  const labels = {
    clocked_in: { text: 'Clocked In', class: 'status-success' },
    clocked_out: { text: 'Clocked Out', class: 'status-secondary' },
    on_break: { text: 'On Break', class: 'status-warning' },
    absent: { text: 'Absent', class: 'status-danger' },
    late: { text: 'Late', class: 'status-danger' },
    present: { text: 'Present', class: 'status-success' }
  };
  return labels[status] || { text: status, class: 'status-default' };
}

export function getNextClockAction(attendance) {
  if (!attendance) return { action: 'clock_in', label: 'Clock In', icon: '⏰' };
  if (!attendance.clockIn) return { action: 'clock_in', label: 'Clock In', icon: '⏰' };
  if (!attendance.breakStart && !attendance.breakEnd) return { action: 'start_break', label: 'Start Break', icon: '☕' };
  if (attendance.breakStart && !attendance.breakEnd) return { action: 'end_break', label: 'End Break', icon: '🔄' };
  if (!attendance.clockOut) return { action: 'clock_out', label: 'Clock Out', icon: '🚪' };
  return null;
}

export function isCurrentWeek(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  return date >= startOfWeek && date <= endOfWeek;
}

export function isCurrentMonth(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

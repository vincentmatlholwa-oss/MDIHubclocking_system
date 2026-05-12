import { STORES, BREAKS, WORK_HOURS } from '../utils/constants';
import { add, getNotificationsByUser, put, getAll } from './db';
import { generateId, today, formatDisplayTime } from '../utils/helpers';

export async function createNotification(data) {
  const notification = {
    id: data.id || generateId(),
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type,
    read: false,
    createdAt: new Date().toISOString(),
    relatedId: data.relatedId || null
  };
  await add(STORES.notifications, notification);
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(data.title, { body: data.message, icon: '/icons/icon-192x192.png' });
  }
  return notification;
}

export async function markNotificationRead(id) {
  const notification = await get(STORES.notifications, id);
  if (notification) {
    notification.read = true;
    await put(STORES.notifications, notification);
  }
}

export async function markAllNotificationsRead(userId) {
  const notifications = await getNotificationsByUser(userId);
  for (const n of notifications) {
    if (!n.read) {
      n.read = true;
      await put(STORES.notifications, n);
    }
  }
}

export function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

export function setupBreakReminders(onNotify) {
  const checkBreaks = () => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    for (const [key, breakInfo] of Object.entries(BREAKS)) {
      const [bH, bM] = breakInfo.start.split(':').map(Number);
      if (hours === bH && minutes === bM) {
        onNotify({
          title: `${breakInfo.label} Time`,
          message: `It's ${breakInfo.label} time (${breakInfo.start} - ${breakInfo.end}). Please take your break.`,
          type: 'break_reminder'
        });
      }
    }
  };
  checkBreaks();
  setInterval(checkBreaks, 60000);
}

export function setupMissedClockoutCheck(onNotify) {
  const check = async () => {
    const now = new Date();
    const [endH, endM] = WORK_HOURS.end.split(':').map(Number);
    if (now.getHours() === endH && now.getMinutes() === endM + 15) {
      const allAttendance = await getAll(STORES.attendance);
      const today = new Date().toISOString().split('T')[0];
      const todayRecords = allAttendance.filter(a => a.date === today && a.clockIn && !a.clockOut);
      for (const record of todayRecords) {
        onNotify({
          userId: record.employeeId,
          title: 'Missed Clock-Out',
          message: `You forgot to clock out yesterday (${formatDisplayTime(new Date(record.clockIn))}). Please clock out now.`,
          type: 'missed_clockout'
        });
      }
    }
  };
  check();
  setInterval(check, 60000);
}

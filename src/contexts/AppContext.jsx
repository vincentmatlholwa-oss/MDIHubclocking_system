import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import { STORES, BREAKS, WORK_HOURS } from '../utils/constants';
import {
  add, put, getAttendanceByEmployeeAndDate,
  getNotificationsByUser
} from '../services/db';
import {
  generateId, today, now, formatTime, formatDate, formatDisplayTime,
  isLateClockIn, isBeforeWorkHours, isAfterWorkHours, getActiveBreak
} from '../utils/helpers';
import { validateLocation, getAddressFromCoords } from '../services/location';
import { createNotification, setupBreakReminders, setupMissedClockoutCheck } from '../services/notifications';
import { syncAll, setupAutoSync } from '../services/sync';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState({ status: 'idle', message: '' });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [locationStatus, setLocationStatus] = useState(null);
  const breakTimerRef = useRef(null);
  const missedClockoutRef = useRef(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!user) return;
    loadTodayAttendance();
    loadNotifications();
    setupAutoSync(120000);
    breakTimerRef.current = setupBreakReminders(async (notification) => {
      if (user) {
        await createNotification({ ...notification, userId: user.employeeId });
        loadNotifications();
      }
    });
    missedClockoutRef.current = setupMissedClockoutCheck(async (notification) => {
      if (user) {
        await createNotification({ ...notification, userId: user.employeeId });
        loadNotifications();
      }
    });
    return () => {
      if (breakTimerRef.current) clearInterval(breakTimerRef.current);
      if (missedClockoutRef.current) clearInterval(missedClockoutRef.current);
    };
  }, [user]);

  const loadTodayAttendance = useCallback(async () => {
    if (!user) return;
    try {
      const record = await getAttendanceByEmployeeAndDate(user.employeeId, today());
      setTodayAttendance(record || null);
    } catch (e) {
      console.error('Load attendance error:', e);
    }
  }, [user]);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    try {
      const notifs = await getNotificationsByUser(user.employeeId);
      setNotifications(notifs);
      setUnreadCount(notifs.filter(n => !n.read).length);
    } catch (e) {
      console.error('Load notifications error:', e);
    }
  }, [user]);

  const clockIn = useCallback(async () => {
    if (!user || todayAttendance?.clockIn) return { success: false, error: 'Already clocked in today' };

    const loc = await validateLocation();
    const address = loc.lat ? await getAddressFromCoords(loc.lat, loc.lng) : 'Location unavailable';

    const late = isLateClockIn();
    const record = {
      id: generateId(),
      employeeId: user.employeeId,
      employeeName: user.name,
      date: today(),
      clockIn: now(),
      clockOut: null,
      breakStart: null,
      breakEnd: null,
      location: { lat: loc.lat, lng: loc.lng, address },
      withinGeofence: loc.withinGeofence,
      status: late ? 'late' : 'clocked_in',
      late: late,
      totalHours: 0,
      overtime: 0,
      synced: false,
      createdAt: now()
    };

    await add(STORES.attendance, record);

    if (late) {
      await createNotification({
        userId: user.employeeId,
        title: 'Late Clock-In',
        message: `You clocked in after ${WORK_HOURS.lateThreshold}. You have been flagged as late.`,
        type: 'late_clockin',
        relatedId: record.id
      });
    }

    await syncAll();
    setTodayAttendance(record);
    return { success: true, late };
  }, [user, todayAttendance]);

  const clockOut = useCallback(async () => {
    if (!user || !todayAttendance?.clockIn) return { success: false, error: 'Not clocked in' };
    if (todayAttendance?.clockOut) return { success: false, error: 'Already clocked out' };

    const loc = await validateLocation();

    const updated = { ...todayAttendance, clockOut: now() };
    if (loc.lat) {
      updated.location = {
        ...updated.location,
        lat: loc.lat,
        lng: loc.lng,
        address: await getAddressFromCoords(loc.lat, loc.lng)
      };
    }

    const start = new Date(todayAttendance.clockIn);
    const end = new Date(updated.clockOut);
    let totalMin = (end - start) / 60000;

    if (todayAttendance.breakStart && todayAttendance.breakEnd) {
      totalMin -= (new Date(todayAttendance.breakEnd) - new Date(todayAttendance.breakStart)) / 60000;
    }

    updated.totalHours = Math.max(0, totalMin / 60);
    updated.status = updated.late && !updated.lateApproved ? 'late' : 'clocked_out';
    updated.synced = false;

    await put(STORES.attendance, updated);
    await syncAll();
    setTodayAttendance(updated);
    return { success: true };
  }, [user, todayAttendance]);

  const startBreak = useCallback(async () => {
    if (!user || !todayAttendance?.clockIn || todayAttendance?.clockOut) {
      return { success: false, error: 'Cannot start break now' };
    }
    const updated = { ...todayAttendance, breakStart: now(), status: 'on_break', synced: false };
    await put(STORES.attendance, updated);
    setTodayAttendance(updated);
    return { success: true };
  }, [user, todayAttendance]);

  const endBreak = useCallback(async () => {
    if (!user || !todayAttendance?.breakStart) {
      return { success: false, error: 'No active break' };
    }
    const updated = { ...todayAttendance, breakEnd: now(), status: 'clocked_in', synced: false };
    await put(STORES.attendance, updated);
    setTodayAttendance(updated);
    return { success: true };
  }, [user, todayAttendance]);

  return (
    <AppContext.Provider value={{
      attendance,
      todayAttendance,
      notifications,
      unreadCount,
      syncStatus,
      isOnline,
      currentTime,
      locationStatus,
      clockIn,
      clockOut,
      startBreak,
      endBreak,
      loadTodayAttendance,
      loadNotifications,
      setSyncStatus
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}

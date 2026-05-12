import { STORES } from '../utils/constants';
import { getUnsyncedRecords, markSynced, add, getAll, getByIndex } from './db';

const API_BASE = 'http://localhost:3000/api';
let isSyncing = false;
let syncCallbacks = [];

export function onSync(callback) {
  syncCallbacks.push(callback);
  return () => { syncCallbacks = syncCallbacks.filter(cb => cb !== callback); };
}

function notifyListeners(status) {
  syncCallbacks.forEach(cb => cb(status));
}

async function syncStore(storeName, endpoint) {
  const records = await getUnsyncedRecords(storeName);
  if (records.length === 0) return 0;
  let synced = 0;
  for (const record of records) {
    try {
      const token = localStorage.getItem('mdihub_token');
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify(record)
      });
      if (res.ok) {
        await markSynced(storeName, record.id);
        synced++;
      }
    } catch (e) {
      console.warn(`Sync failed for ${storeName}/${record.id}:`, e.message);
    }
  }
  return synced;
}

export async function syncAll() {
  if (isSyncing) return;
  if (!navigator.onLine) {
    notifyListeners({ status: 'offline', message: 'No internet connection' });
    return;
  }
  isSyncing = true;
  notifyListeners({ status: 'syncing', message: 'Syncing data...' });
  try {
    const attendanceSynced = await syncStore(STORES.attendance, '/attendance/sync');
    const leaveSynced = await syncStore(STORES.leaveRequests, '/leave/sync');
    const totalSynced = attendanceSynced + leaveSynced;
    notifyListeners({
      status: 'success',
      message: totalSynced > 0 ? `Synced ${totalSynced} records` : 'All up to date',
      count: totalSynced
    });
  } catch (error) {
    notifyListeners({ status: 'error', message: 'Sync failed: ' + error.message });
  } finally {
    isSyncing = false;
  }
}

export async function fetchFromServer(endpoint, options = {}) {
  if (!navigator.onLine) return null;
  const token = localStorage.getItem('mdihub_token');
  try {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        ...options.headers
      },
      ...options
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function setupAutoSync(intervalMs = 60000) {
  window.addEventListener('online', () => {
    setTimeout(syncAll, 2000);
  });
  setInterval(() => {
    if (navigator.onLine) syncAll();
  }, intervalMs);
  if (navigator.onLine) {
    setTimeout(syncAll, 3000);
  }
}

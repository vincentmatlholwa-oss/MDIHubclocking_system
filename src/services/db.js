import { openDB } from 'idb';
import { DB_NAME, DB_VERSION, STORES } from '../utils/constants';

let db = null;

export async function initDB() {
  db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(database) {
      for (const store of Object.values(STORES)) {
        if (!database.objectStoreNames.contains(store)) {
          const storeObj = database.createObjectStore(store, { keyPath: 'id' });
          if (store === STORES.attendance) {
            storeObj.createIndex('employeeId', 'employeeId', { unique: false });
            storeObj.createIndex('date', 'date', { unique: false });
            storeObj.createIndex('employeeDate', ['employeeId', 'date'], { unique: true });
            storeObj.createIndex('synced', 'synced', { unique: false });
          } else if (store === STORES.users) {
            storeObj.createIndex('employeeId', 'employeeId', { unique: true });
            storeObj.createIndex('email', 'email', { unique: true });
            storeObj.createIndex('role', 'role', { unique: false });
          } else if (store === STORES.leaveRequests) {
            storeObj.createIndex('employeeId', 'employeeId', { unique: false });
            storeObj.createIndex('status', 'status', { unique: false });
            storeObj.createIndex('synced', 'synced', { unique: false });
          } else if (store === STORES.notifications) {
            storeObj.createIndex('userId', 'userId', { unique: false });
            storeObj.createIndex('read', 'read', { unique: false });
            storeObj.createIndex('createdAt', 'createdAt', { unique: false });
          } else if (store === STORES.syncQueue) {
            storeObj.createIndex('syncing', 'syncing', { unique: false });
            storeObj.createIndex('createdAt', 'createdAt', { unique: false });
          } else if (store === STORES.departments) {
            storeObj.createIndex('name', 'name', { unique: true });
          } else if (store === STORES.loginHistory) {
            storeObj.createIndex('userId', 'userId', { unique: false });
            storeObj.createIndex('timestamp', 'timestamp', { unique: false });
          }
        }
      }
    }
  });
  return db;
}

export function getDB() {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export async function add(storeName, data) {
  const db = getDB();
  return db.add(storeName, data);
}

export async function put(storeName, data) {
  const db = getDB();
  return db.put(storeName, data);
}

export async function get(storeName, id) {
  const db = getDB();
  return db.get(storeName, id);
}

export async function getAll(storeName) {
  const db = getDB();
  return db.getAll(storeName);
}

export async function deleteItem(storeName, id) {
  const db = getDB();
  return db.delete(storeName, id);
}

export async function getByIndex(storeName, indexName, value) {
  const db = getDB();
  return db.getAllFromIndex(storeName, indexName, value);
}

export async function getByRange(storeName, indexName, range) {
  const db = getDB();
  return db.getAllFromIndex(storeName, indexName, range);
}

export async function getOneByIndex(storeName, indexName, value) {
  const db = getDB();
  const results = await db.getAllFromIndex(storeName, indexName, value);
  return results[0] || null;
}

export async function clearStore(storeName) {
  const db = getDB();
  return db.clear(storeName);
}

export async function getUnsyncedRecords(storeName) {
  return getByIndex(storeName, 'synced', false);
}

export async function markSynced(storeName, id) {
  const record = await get(storeName, id);
  if (record) {
    record.synced = true;
    record.syncedAt = new Date().toISOString();
    return put(storeName, record);
  }
}

export async function getAttendanceByEmployeeAndDate(employeeId, date) {
  const db = getDB();
  const index = db.transaction(STORES.attendance).store.index('employeeDate');
  return index.get([employeeId, date]);
}

export async function getAttendanceByDate(date) {
  const db = getDB();
  return db.getAllFromIndex(STORES.attendance, 'date', date);
}

export async function getAttendanceByEmployee(employeeId) {
  return getByIndex(STORES.attendance, 'employeeId', employeeId);
}

export async function getNotificationsByUser(userId) {
  const db = getDB();
  const notifications = await db.getAllFromIndex(STORES.notifications, 'userId', userId);
  return notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getUnreadNotificationsCount(userId) {
  const db = getDB();
  const notifications = await db.getAllFromIndex(STORES.notifications, 'userId', userId);
  return notifications.filter(n => !n.read).length;
}

export async function seedInitialData() {
  const db = getDB();
  const userCount = await db.count(STORES.users);
  if (userCount > 0) return;

  const initialUsers = [
    {
      id: 'USR_001',
      employeeId: 'ADM001',
      name: 'System Admin',
      email: 'admin@mdihub.com',
      pin: '1234',
      password: 'admin123',
      role: 'admin',
      department: 'Management',
      phone: '0810000001',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR_002',
      employeeId: 'MGR001',
      name: 'Jane Manager',
      email: 'manager@mdihub.com',
      pin: '5678',
      password: 'manager123',
      role: 'manager',
      department: 'Software Development',
      phone: '0810000002',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR_003',
      employeeId: 'EMP001',
      name: 'John Employee',
      email: 'john@mdihub.com',
      pin: '9012',
      password: 'emp123',
      role: 'employee',
      department: 'Software Development',
      phone: '0810000003',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR_004',
      employeeId: 'EMP002',
      name: 'Sarah Developer',
      email: 'sarah@mdihub.com',
      pin: '3456',
      password: 'emp123',
      role: 'employee',
      department: 'Digital Innovation',
      phone: '0810000004',
      createdAt: new Date().toISOString()
    },
    {
      id: 'USR_005',
      employeeId: 'EMP003',
      name: 'Mike Support',
      email: 'mike@mdihub.com',
      pin: '7890',
      password: 'emp123',
      role: 'employee',
      department: 'IT Support',
      phone: '0810000005',
      createdAt: new Date().toISOString()
    }
  ];

  for (const user of initialUsers) {
    await db.add(STORES.users, user);
  }

  const initialDepartments = [
    { id: 'DEPT_1', name: 'Software Development', description: 'Software engineering and development' },
    { id: 'DEPT_2', name: 'Digital Innovation', description: 'Digital transformation and innovation' },
    { id: 'DEPT_3', name: 'IT Support', description: 'Technical support and infrastructure' },
    { id: 'DEPT_4', name: 'Administration', description: 'Administrative services' },
    { id: 'DEPT_5', name: 'Human Resources', description: 'HR and personnel management' },
    { id: 'DEPT_6', name: 'Finance', description: 'Financial management' },
    { id: 'DEPT_7', name: 'Marketing', description: 'Marketing and communications' },
    { id: 'DEPT_8', name: 'Management', description: 'Executive management' }
  ];

  for (const dept of initialDepartments) {
    await db.add(STORES.departments, dept);
  }
}

export async function resetDatabase() {
  const db = getDB();
  const stores = Object.values(STORES);
  for (const store of stores) {
    await db.clear(store);
  }
  await seedInitialData();
}

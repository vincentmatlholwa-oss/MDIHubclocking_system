import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { STORES } from '../utils/constants';
import { getDB, getOneByIndex, add } from '../services/db';
import { generateId, formatDateTime } from '../utils/helpers';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('mdihub_user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch {}
    }
    setLoading(false);
  }, []);

  const login = useCallback(async (employeeId, pin) => {
    const db = getDB();
    const userData = await getOneByIndex(STORES.users, 'employeeId', employeeId);
    if (!userData) throw new Error('Invalid employee ID or PIN');

    const pinMatch = userData.pin === pin;
    const passwordMatch = userData.password === pin;
    if (!pinMatch && !passwordMatch) throw new Error('Invalid employee ID or PIN');

    const sessionUser = {
      id: userData.id,
      employeeId: userData.employeeId,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      department: userData.department,
      phone: userData.phone
    };

    localStorage.setItem('mdihub_user', JSON.stringify(sessionUser));
    localStorage.setItem('mdihub_token', `local_${sessionUser.employeeId}_${Date.now()}`);
    setUser(sessionUser);

    await add(STORES.loginHistory, {
      id: generateId(),
      userId: userData.employeeId,
      timestamp: new Date().toISOString(),
      method: 'pin',
      success: true
    });

    return sessionUser;
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mdihub_user');
    localStorage.removeItem('mdihub_token');
  }, []);

  const isAdmin = user?.role === 'admin' || user?.role === 'manager';
  const isEmployee = user?.role === 'employee';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isEmployee }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

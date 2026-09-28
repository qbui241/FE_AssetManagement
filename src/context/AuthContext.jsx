import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearToken, getToken, setToken } from '../api/client';
import { authApi, userApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  // Khi bat ky request nao nhan 401, client.js phat su kien nay.
  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('am:unauthorized', onUnauthorized);
    return () => window.removeEventListener('am:unauthorized', onUnauthorized);
  }, [logout]);

  // Khoi phuc phien tu token con luu trong localStorage.
  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    userApi
      .me()
      .then(setUser)
      .catch(() => clearToken())
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username, password) => {
    const token = await authApi.login(username, password);
    if (!token || typeof token !== 'string' || !token.trim()) {
      throw new Error('Máy chủ không trả về token hợp lệ.');
    }
    setToken(token.trim());
    const me = await userApi.me();
    setUser(me);
    return me;
  }, []);

  const roles = user?.roles ?? [];
  const value = {
    user,
    roles,
    loading,
    login,
    logout,
    refreshUser: () => userApi.me().then(setUser),
    hasRole: (...wanted) => wanted.some((role) => roles.includes(role)),
    // Nhan vien moi dang ky chua duoc ADMIN gan role -> chi xem duoc rat it man hinh.
    hasNoRole: Boolean(user) && roles.length === 0,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}

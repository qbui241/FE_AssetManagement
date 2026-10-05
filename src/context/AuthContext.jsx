import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { clearToken, getToken, setToken } from '../api/client';
import { authApi, notificationApi, userApi } from '../api/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));
  const [unreadCount, setUnreadCount] = useState(0);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    setUnreadCount(0);
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

  const refreshUnreadCount = useCallback(() => {
    return notificationApi
      .unreadCount()
      .then((res) => setUnreadCount(res?.unreadCount ?? 0))
      .catch(() => { });
  }, []);

  // 1) Mo 1 ket noi SSE duy nhat cho ca phien, dong khi dang xuat/unmount.
  // 2) Luoi an toan: dong bo lai so chinh xac dinh ky, phong khi lo su kien SSE
  //    (mat mang tam thoi, server restart giua luc dang mo ket noi).
  useEffect(() => {
    if (!user) return;

    refreshUnreadCount();

    const source = new EventSource(notificationApi.streamUrl());
    source.addEventListener('notification', () => {
      setUnreadCount((prev) => prev + 1);
      // Cho cac trang khac (vd. Notifications.jsx) biet de tu lam moi danh sach.
      window.dispatchEvent(new CustomEvent('am:notification'));
    });

    const timer = setInterval(refreshUnreadCount, 60000);

    return () => {
      source.close();
      clearInterval(timer);
    };
  }, [user?.id, refreshUnreadCount]);

  const roles = user?.roles ?? [];
  const value = {
    user,
    roles,
    loading,
    login,
    logout,
    refreshUser: () => userApi.me().then(setUser),
    hasRole: (...wanted) => wanted.some((role) => roles.includes(role)),
    hasNoRole: Boolean(user) && roles.length === 0,
    unreadCount,
    refreshUnreadCount,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth phải nằm trong AuthProvider');
  return ctx;
}
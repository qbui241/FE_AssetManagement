import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const ToastContext = createContext(null);

let uid = 0;

const DURATION = { success: 3500, info: 4000, warning: 5000, error: 6000 };
const ICON = { success: '✓', error: '✕', warning: '!', info: 'i' };

// Dung: const toast = useToast();
//       toast.success('Đã lưu.');
//       toast.error('Không xoá được: còn tài sản đang mượn.');
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (message, type = 'info') => {
      if (!message) return;
      const id = ++uid;
      setToasts((list) => [...list, { id, type, message }]);
      timers.current[id] = setTimeout(() => remove(id), DURATION[type] ?? DURATION.info);
      return id;
    },
    [remove]
  );

  const toast = useMemo(
    () => ({
      push,
      success: (message) => push(message, 'success'),
      error: (message) => push(message, 'error'),
      warning: (message) => push(message, 'warning'),
      info: (message) => push(message, 'info'),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.type}`} role={t.type === 'error' ? 'alert' : 'status'}>
            <span className="toast-icon">{ICON[t.type] ?? ICON.info}</span>
            <span className="toast-msg">{t.message}</span>
            <button type="button" className="toast-close" onClick={() => remove(t.id)} aria-label="Đóng thông báo">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useToast phải nằm trong ToastProvider');
  return toast;
}

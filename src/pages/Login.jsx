import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Alert, Field } from '../components/ui';

const DEMO = [
  ['admin', 'Admin@123'],
  ['director.hn', 'Director@123'],
  ['manager.it.hn', 'Manager@123'],
  ['employee1', 'Employee@123'],
];

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(form.username, form.password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(
        err.status === 401 || err.status === 403
          ? 'Tên đăng nhập hoặc mật khẩu không đúng.'
          : err.message
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <h1>Hệ thống quản lý tài sản</h1>

      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <h2>Đăng nhập</h2>
          <p className="sub">Dùng tài khoản nội bộ của bạn.</p>

          <Alert kind="error">{error}</Alert>

          <form onSubmit={submit}>
            <Field label="Tên đăng nhập" required>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                autoFocus
                required
              />
            </Field>
            <Field label="Mật khẩu" required>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
            </Field>
            <button className="btn btn-primary" disabled={busy}>
              {busy ? 'Đang đăng nhập…' : 'Đăng nhập'}
            </button>
          </form>

          <p className="swap">
            Chưa có tài khoản? Liên hệ Trưởng phòng/ADMIN để được tạo tài khoản.
          </p>

          <div className="demo-creds">
            <div style={{ fontWeight: 600, color: 'var(--ink-soft)', marginBottom: 4 }}>
              Tài khoản demo
            </div>
            {DEMO.map(([u, p]) => (
              <div key={u}>
                <span className="mono">{u}</span>
                <span className="mono">{p}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
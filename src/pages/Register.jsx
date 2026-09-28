import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi, departmentApi } from '../api/endpoints';
import { Alert, Field, deptLabel } from '../components/ui';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    departmentId: '',
  });
  const [departments, setDepartments] = useState([]);
  const [deptError, setDeptError] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  // GET /api/departments yeu cau dang nhap, nen o man hinh dang ky se that bai.
  // Khi do cho nguoi dung tu nhap ID phong ban thay vi chon tu danh sach.
  useEffect(() => {
    departmentApi
      .list()
      .then(setDepartments)
      .catch(() => setDeptError('Không tải được danh sách phòng ban, vui lòng nhập mã phòng ban.'));
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await authApi.register({
        ...form,
        departmentId: Number(form.departmentId),
      });
      setDone(true);
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-wrap">
      <aside className="auth-aside">
        <h1>Tạo tài khoản để bắt đầu đề xuất tài sản</h1>
        <p>
          Sau khi đăng ký, quản trị viên sẽ gán vai trò phù hợp. Trong lúc chờ, bạn vẫn xem được
          tài sản và gửi yêu cầu cấp phát.
        </p>
      </aside>

      <div className="auth-main">
        <div className="auth-card">
          <h2>Đăng ký</h2>
          <p className="sub">Tài khoản mới chưa có vai trò cho đến khi được gán.</p>

          <Alert kind="error">{error}</Alert>
          {done && <Alert kind="success">Đăng ký thành công. Đang chuyển đến trang đăng nhập…</Alert>}
          {deptError && <Alert kind="info">{deptError}</Alert>}

          <form onSubmit={submit}>
            <Field label="Họ và tên" required>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>
            <Field label="Tên đăng nhập" required>
              <input
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                autoComplete="username"
                required
              />
            </Field>
            <Field label="Email" required>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </Field>
            <Field label="Mật khẩu" required>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                autoComplete="new-password"
                required
              />
            </Field>
            <Field label="Phòng ban" required>
              {departments.length ? (
                <select
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  required
                >
                  <option value="">Chọn phòng ban</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {deptLabel(d)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min="1"
                  value={form.departmentId}
                  onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  placeholder="Mã phòng ban, ví dụ 1"
                  required
                />
              )}
            </Field>

            <button className="btn btn-primary" disabled={busy || done}>
              {busy ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
            </button>
          </form>

          <p className="swap">
            Đã có tài khoản? <Link to="/login">Đăng nhập</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

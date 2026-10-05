import { useEffect, useState } from 'react';
import { departmentApi, roleApi, userApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Empty,
  Field,
  Loading,
  Modal,
  Pagination,
  Panel,
  deptLabel,
  branchIdOf,
  useDebouncedValue,
} from '../components/ui';
import { IconPencil, IconShield, IconTrash } from '../components/icons';

const ROLE_OPTIONS = ['MANAGER', 'DIRECTOR', 'ADMIN'];
const PAGE_SIZE = 20;

export default function Users() {
  const { hasRole, user: me } = useAuth();
  const canWrite = hasRole('MANAGER', 'DIRECTOR', 'ADMIN');
  const canAssignRole = hasRole('DIRECTOR', 'ADMIN');

  const [result, setResult] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [q, setQ] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [page, setPage] = useState(0);

  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [assigning, setAssigning] = useState(null);

  const keyword = useDebouncedValue(q.trim());

  useEffect(() => {
    departmentApi.list().then(setDepartments).catch(() => { });
    roleApi.list().then(setRoles).catch(() => { });
  }, []);

  const load = () => {
    setLoading(true);
    return userApi
      .list({ q: keyword, departmentId, roleName, page, size: PAGE_SIZE })
      .then((res) => {
        setResult(res);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let alive = true;
    setLoading(true);
    userApi
      .list({ q: keyword, departmentId, roleName, page, size: PAGE_SIZE })
      .then((res) => {
        if (!alive) return;
        setResult(res);
        setError('');
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, departmentId, roleName, page]);

  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  const deptById = Object.fromEntries(departments.map((d) => [d.id, d]));
  const myBranchId = branchIdOf(deptById[me?.departmentId]);
  const visibleDepartments = hasRole('ADMIN')
    ? departments
    : departments.filter((d) => branchIdOf(d) === myBranchId);
  const users = result?.content ?? [];
  const total = result?.totalElements ?? 0;
  const filtering = Boolean(keyword || departmentId || roleName);

  const remove = async (u) => {
    if (!confirm(`Xoá người dùng ${u.username}?`)) return;
    setBusyId(u.id);
    setError('');
    setNotice('');
    try {
      await userApi.remove(u.id);
      setNotice(`Đã xoá ${u.username}.`);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>
      <Alert kind="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>

      <Panel
        title={`Người dùng (${total})`}
        actions={
          canWrite && (
            <button className="btn btn-lg btn-primary" onClick={() => setCreating(true)}>
              Thêm người dùng
            </button>
          )
        }
        bodyless
      >
        <div className="panel-body" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="filters">
            <input
              placeholder="Tìm tên, tài khoản, email…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              style={{ minWidth: 220 }}
            />
            <select value={departmentId} onChange={(e) => updateFilter(setDepartmentId)(e.target.value)}>
              <option value="">Mọi phòng ban</option>
              {visibleDepartments.map((d) => (
                <option key={d.id} value={d.id}>
                  {deptLabel(d)}
                </option>
              ))}
            </select>
            <select value={roleName} onChange={(e) => updateFilter(setRoleName)(e.target.value)}>
              <option value="">Mọi vai trò</option>
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            {filtering && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setQ('');
                  setDepartmentId('');
                  setRoleName('');
                  setPage(0);
                }}
              >
                Xoá bộ lọc
              </button>
            )}
          </div>
        </div>

        {loading && !result ? (
          <Loading />
        ) : users.length === 0 ? (
          <Empty title={filtering ? 'Không có kết quả khớp' : 'Chưa có người dùng nào'} />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tài khoản</th>
                    <th>Họ tên</th>
                    <th>Email</th>
                    <th>Phòng ban</th>
                    <th>Vai trò</th>
                    <th className="actions-col">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td className="mono">{u.username}</td>
                      <td className="cell-title">
                        {u.name}
                        {u.id === me?.id && (
                          <span style={{ color: 'var(--ink-faint)' }}> (bạn)</span>
                        )}
                      </td>
                      <td>{u.email}</td>
                      <td>{deptLabel(deptById[u.departmentId]) ?? u.departmentId}</td>
                      <td>
                        <div className="chip-list">
                          {u.roles?.length ? (
                            u.roles.map((r) => (
                              <span key={r} className="badge badge-role">
                                {r}
                              </span>
                            ))
                          ) : (
                            <span className="badge badge-pending">Chưa gán</span>
                          )}
                        </div>
                      </td>
                      <td className="actions-col">
                        <div className="row-actions">
                          {canAssignRole && (
                            <button
                              className="icon-btn primary"
                              title="Gán vai trò"
                              aria-label={`Gán vai trò cho ${u.username}`}
                              disabled={busyId === u.id}
                              onClick={() => setAssigning(u)}
                            >
                              <IconShield />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              className="icon-btn"
                              title="Sửa thông tin"
                              aria-label={`Sửa ${u.username}`}
                              disabled={busyId === u.id}
                              onClick={() => setEditing(u)}
                            >
                              <IconPencil />
                            </button>
                          )}
                          {canWrite && (
                            <button
                              className="icon-btn danger"
                              title="Xoá người dùng"
                              aria-label={`Xoá ${u.username}`}
                              disabled={busyId === u.id || u.id === me?.id}
                              onClick={() => remove(u)}
                            >
                              <IconTrash />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={result?.totalPages ?? 0}
              totalElements={total}
              onChange={setPage}
              unit="người dùng"
            />
          </>
        )}
      </Panel>

      {(creating || editing) && (
        <UserFormModal
          user={editing}
          departments={visibleDepartments}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={() => {
            setCreating(false);
            setEditing(null);
            setNotice('Đã lưu thông tin người dùng.');
            load();
          }}
        />
      )}

      {assigning && (
        <AssignRoleModal
          user={assigning}
          roles={roles}
          onClose={() => setAssigning(null)}
          onSaved={() => {
            setAssigning(null);
            setNotice('Đã gán vai trò.');
            load();
          }}
        />
      )}
    </>
  );
}

function UserFormModal({ user, departments, onClose, onSaved }) {
  const editing = Boolean(user);
  const [form, setForm] = useState({
    name: user?.name ?? '',
    username: user?.username ?? '',
    email: user?.email ?? '',
    password: '',
    departmentId: String(user?.departmentId ?? ''),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    const payload = {
      name: form.name.trim(),
      username: form.username.trim(),
      email: form.email.trim(),
      password: form.password,
      departmentId: Number(form.departmentId),
    };
    try {
      if (editing) await userApi.update(user.id, payload);
      else await userApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa ${user.username}` : 'Thêm người dùng'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="user-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>

      {editing && (
        <div className="alert alert-info">
          Backend chỉ cập nhật họ tên, email và phòng ban. Tài khoản và mật khẩu không đổi được ở
          đây.
        </div>
      )}

      <form id="user-form" onSubmit={submit}>
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
            disabled={editing}
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
        {!editing && (
          <Field label="Mật khẩu" required>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="new-password"
              required
            />
          </Field>
        )}
        <Field label="Phòng ban" required>
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
        </Field>
      </form>
    </Modal>
  );
}

function AssignRoleModal({ user, roles, onClose, onSaved }) {
  const [roleId, setRoleId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await userApi.assignRole(user.id, Number(roleId));
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={`Gán vai trò cho ${user.username}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="role-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang gán…' : 'Gán vai trò'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>

      <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
        Vai trò hiện tại: {user.roles?.length ? user.roles.join(', ') : 'chưa có'}
      </p>

      <div className="alert alert-info">
        DIRECTOR chỉ gán được cho người cùng chi nhánh; ADMIN không bị giới hạn.
      </div>

      <form id="role-form" onSubmit={submit}>
        <Field label="Vai trò" required>
          <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
            <option value="">Chọn vai trò</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
                {r.description ? ` — ${r.description}` : ''}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

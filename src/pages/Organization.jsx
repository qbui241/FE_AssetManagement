import { useEffect, useState } from 'react';
import { branchApi, departmentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Empty,
  Field,
  Loading,
  Modal,
  Panel,
  branchIdOf,
  branchNameOf,
} from '../components/ui';
import { IconPencil, IconTrash } from '../components/icons';

export default function Organization() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [branches, setBranches] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const [branchForm, setBranchForm] = useState(null); // {} = tao moi, {id...} = sua
  const [deptForm, setDeptForm] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([branchApi.list(), departmentApi.list()])
      .then(([b, d]) => {
        setBranches(b ?? []);
        setDepartments(d ?? []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const removeBranch = async (b) => {
    if (!confirm(`Xoá chi nhánh ${b.name}?`)) return;
    try {
      await branchApi.remove(b.id);
      setNotice(`Đã xoá chi nhánh ${b.name}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeDept = async (d) => {
    if (!confirm(`Xoá phòng ban ${d.name}?`)) return;
    try {
      await departmentApi.remove(d.id);
      setNotice(`Đã xoá phòng ban ${d.name}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>
      <Alert kind="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>

      <div className="two-col">
        <Panel
          title={`Chi nhánh (${branches.length})`}
          actions={
            isAdmin && (
              <button className="btn btn-lg btn-primary" onClick={() => setBranchForm({})}>
                Thêm
              </button>
            )
          }
          bodyless
        >
          {branches.length === 0 ? (
            <Empty title="Chưa có chi nhánh nào" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Địa chỉ</th>
                    {isAdmin && <th className="actions-col">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {branches.map((b) => (
                    <tr key={b.id}>
                      <td className="cell-title">{b.name}</td>
                      <td>{b.address || '—'}</td>
                      {isAdmin && (
                        <td className="actions-col">
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              title="Sửa chi nhánh"
                              onClick={() => setBranchForm(b)}
                            >
                              <IconPencil />
                            </button>
                            <button
                              className="icon-btn danger"
                              title="Xoá chi nhánh"
                              onClick={() => removeBranch(b)}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title={`Phòng ban (${departments.length})`}
          actions={
            isAdmin && (
              <button
                className="btn btn-lg btn-primary"
                disabled={branches.length === 0}
                onClick={() => setDeptForm({})}
              >
                Thêm
              </button>
            )
          }
          bodyless
        >
          {departments.length === 0 ? (
            <Empty title="Chưa có phòng ban nào" hint="Tạo chi nhánh trước, rồi thêm phòng ban." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Chi nhánh</th>
                    {isAdmin && <th className="actions-col">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {departments.map((d) => (
                    <tr key={d.id}>
                      <td className="cell-title">{d.name}</td>
                      <td>{branchNameOf(d) ?? '—'}</td>
                      {isAdmin && (
                        <td className="actions-col">
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              title="Sửa phòng ban"
                              onClick={() => setDeptForm(d)}
                            >
                              <IconPencil />
                            </button>
                            <button
                              className="icon-btn danger"
                              title="Xoá phòng ban"
                              onClick={() => removeDept(d)}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {branchForm && (
        <BranchModal
          branch={branchForm.id ? branchForm : null}
          onClose={() => setBranchForm(null)}
          onSaved={() => {
            setBranchForm(null);
            setNotice('Đã lưu chi nhánh.');
            load();
          }}
        />
      )}

      {deptForm && (
        <DepartmentModal
          dept={deptForm.id ? deptForm : null}
          branches={branches}
          onClose={() => setDeptForm(null)}
          onSaved={() => {
            setDeptForm(null);
            setNotice('Đã lưu phòng ban.');
            load();
          }}
        />
      )}
    </>
  );
}

function BranchModal({ branch, onClose, onSaved }) {
  const editing = Boolean(branch);
  const [form, setForm] = useState({
    name: branch?.name ?? '',
    address: branch?.address ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), address: form.address.trim() };
      if (editing) await branchApi.update(branch.id, payload);
      else await branchApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa chi nhánh ${branch.name}` : 'Thêm chi nhánh'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="branch-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>
      <form id="branch-form" onSubmit={submit}>
        <Field label="Tên chi nhánh" required>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Địa chỉ">
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
          />
        </Field>
      </form>
    </Modal>
  );
}

function DepartmentModal({ dept, branches, onClose, onSaved }) {
  const editing = Boolean(dept);
  const [form, setForm] = useState({
    name: dept?.name ?? '',
    branchId: String(branchIdOf(dept) ?? ''),
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      // DepartmentController nhan entity Department, nen chi nhanh phai gui
      // duoi dang object long nhau { id } chu khong phai branchId phang.
      const payload = { name: form.name.trim(), branch: { id: Number(form.branchId) } };
      if (editing) await departmentApi.update(dept.id, payload);
      else await departmentApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa phòng ban ${dept.name}` : 'Thêm phòng ban'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="dept-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>
      <form id="dept-form" onSubmit={submit}>
        <Field label="Tên phòng ban" required hint="Tên chỉ cần duy nhất trong cùng một chi nhánh.">
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Chi nhánh" required>
          <select
            value={form.branchId}
            onChange={(e) => setForm({ ...form, branchId: e.target.value })}
            required
          >
            <option value="">Chọn chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>
      </form>
    </Modal>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { branchApi, departmentApi, roleApi, stepApi, workflowApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Empty,
  Field,
  Loading,
  Modal,
  Panel,
  deptLabel,
  formatMoney,
} from '../components/ui';
import { IconPencil, IconTrash } from '../components/icons';

const SCOPES = [
  ['REQUESTER_DEPARTMENT', 'Phòng ban người yêu cầu'],
  ['ASSET_DEPARTMENT', 'Phòng ban của tài sản'],
  ['SPECIFIC_DEPARTMENT', 'Một phòng ban cụ thể'],
  ['REQUESTER_BRANCH', 'Chi nhánh người yêu cầu'],
  ['ASSET_BRANCH', 'Chi nhánh của tài sản'],
  ['SPECIFIC_BRANCH', 'Một chi nhánh cụ thể'],
  ['ANY', 'Không giới hạn'],
];
const SCOPE_LABEL = Object.fromEntries(SCOPES);

export default function Workflows() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [workflows, setWorkflows] = useState([]);
  const [steps, setSteps] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [activeWorkflowId, setActiveWorkflowId] = useState(null);

  const [wfForm, setWfForm] = useState(null);
  const [stepForm, setStepForm] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([
      workflowApi.list(),
      stepApi.list().catch(() => []),
      roleApi.list().catch(() => []),
      departmentApi.list().catch(() => []),
      branchApi.list().catch(() => []),
    ])
      .then(([w, s, r, d, b]) => {
        setWorkflows(w ?? []);
        setSteps(s ?? []);
        setRoles(r ?? []);
        setDepartments(d ?? []);
        setBranches(b ?? []);
        setError('');
        setActiveWorkflowId((prev) => prev ?? (w?.[0]?.id ?? null));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const activeWorkflow = workflows.find((w) => w.id === activeWorkflowId) ?? null;

  // Sap theo stepOrder; cac step cung stepOrder la duyet song song.
  const workflowSteps = useMemo(
    () =>
      steps
        .filter((s) => s.workflowId === activeWorkflowId)
        .sort((a, b) => a.stepOrder - b.stepOrder || a.id - b.id),
    [steps, activeWorkflowId]
  );

  const removeWorkflow = async (w) => {
    if (!confirm(`Xoá quy trình "${w.name}"? Các bước thuộc quy trình này cũng bị ảnh hưởng.`))
      return;
    try {
      await workflowApi.remove(w.id);
      setNotice(`Đã xoá quy trình ${w.name}.`);
      setActiveWorkflowId(null);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeStep = async (s) => {
    if (!confirm(`Xoá bước ${s.stepOrder} (${s.roleName})?`)) return;
    try {
      await stepApi.remove(s.id);
      setNotice('Đã xoá bước duyệt.');
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

      <Panel
        title={`Quy trình phê duyệt (${workflows.length})`}
        description="Mỗi loại hành động chỉ nên có một quy trình đang bật."
        actions={
          isAdmin && (
            <button className="btn btn-sm btn-primary" onClick={() => setWfForm({})}>
              Thêm quy trình
            </button>
          )
        }
        bodyless
      >
        {workflows.length === 0 ? (
          <Empty title="Chưa có quy trình nào" />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tên</th>
                  <th>Hành động</th>
                  <th>Kiểu</th>
                  <th>Trạng thái</th>
                  <th className="num">Số bước</th>
                  <th className="actions-col">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {workflows.map((w) => (
                  <tr
                    key={w.id}
                    style={
                      w.id === activeWorkflowId
                        ? { background: 'var(--accent-wash)' }
                        : { cursor: 'pointer' }
                    }
                    onClick={() => setActiveWorkflowId(w.id)}
                  >
                    <td className="cell-title">{w.name}</td>
                    <td>{w.actionType === 'ASSIGNMENT' ? 'Cấp phát' : 'Thanh lý'}</td>
                    <td>
                      <span className={`badge ${w.type === 'PARALLEL' ? 'badge-bulk' : 'badge-individual'}`}>
                        {w.type === 'PARALLEL' ? 'Song song' : 'Tuần tự'}
                      </span>
                    </td>
                    <td>
                      {w.active ? (
                        <span className="badge badge-approved">Đang bật</span>
                      ) : (
                        <span className="badge badge-cancelled">Đã tắt</span>
                      )}
                    </td>
                    <td className="num">{steps.filter((s) => s.workflowId === w.id).length}</td>
                    <td className="actions-col">
                      <div className="row-actions">
                        {isAdmin && (
                          <button
                            className="icon-btn"
                            title="Sửa quy trình"
                            onClick={(e) => {
                              e.stopPropagation();
                              setWfForm(w);
                            }}
                          >
                            <IconPencil />
                          </button>
                        )}
                        {isAdmin && (
                          <button
                            className="icon-btn danger"
                            title="Xoá quy trình"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeWorkflow(w);
                            }}
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
        )}
      </Panel>

      <Panel
        title={
          activeWorkflow
            ? `Các bước của "${activeWorkflow.name}" (${workflowSteps.length})`
            : 'Các bước duyệt'
        }
        description={
          activeWorkflow?.type === 'PARALLEL'
            ? 'Các bước cùng số thứ tự sẽ được duyệt đồng thời.'
            : 'Các bước chạy lần lượt theo số thứ tự tăng dần.'
        }
        actions={
          isAdmin &&
          activeWorkflow && (
            <button className="btn btn-sm btn-primary" onClick={() => setStepForm({})}>
              Thêm bước
            </button>
          )
        }
        bodyless
      >
        {!activeWorkflow ? (
          <Empty title="Chọn một quy trình ở bảng trên để xem các bước" />
        ) : workflowSteps.length === 0 ? (
          <Empty
            title="Quy trình này chưa có bước nào"
            hint="Yêu cầu dùng quy trình rỗng sẽ không tạo được task duyệt."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th className="num">Bước</th>
                  <th>Vai trò duyệt</th>
                  <th>Phạm vi</th>
                  <th>Đơn vị cụ thể</th>
                  <th className="num">Ngưỡng giá trị</th>
                  {isAdmin && <th className="actions-col">Thao tác</th>}
                </tr>
              </thead>
              <tbody>
                {workflowSteps.map((s) => (
                  <tr key={s.id}>
                    <td className="num">{s.stepOrder}</td>
                    <td>
                      <span className="badge badge-role">{s.roleName}</span>
                    </td>
                    <td>{SCOPE_LABEL[s.departmentScope] ?? s.departmentScope}</td>
                    <td>{s.departmentName || s.branchName || '—'}</td>
                    <td className="num">
                      {s.minValue == null && s.maxValue == null ? (
                        <span style={{ color: 'var(--ink-faint)' }}>Mọi giá trị</span>
                      ) : (
                        <>
                          {s.minValue != null && `từ ${formatMoney(s.minValue)}`}
                          {s.minValue != null && s.maxValue != null && ' '}
                          {s.maxValue != null && `đến ${formatMoney(s.maxValue)}`}
                        </>
                      )}
                    </td>
                    {isAdmin && (
                      <td className="actions-col">
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Sửa bước"
                            onClick={() => setStepForm(s)}
                          >
                            <IconPencil />
                          </button>
                          <button
                            className="icon-btn danger"
                            title="Xoá bước"
                            onClick={() => removeStep(s)}
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

      {wfForm && (
        <WorkflowModal
          workflow={wfForm.id ? wfForm : null}
          onClose={() => setWfForm(null)}
          onSaved={() => {
            setWfForm(null);
            setNotice('Đã lưu quy trình.');
            load();
          }}
        />
      )}

      {stepForm && activeWorkflow && (
        <StepModal
          step={stepForm.id ? stepForm : null}
          workflow={activeWorkflow}
          roles={roles}
          departments={departments}
          branches={branches}
          nextOrder={(workflowSteps.at(-1)?.stepOrder ?? 0) + 1}
          onClose={() => setStepForm(null)}
          onSaved={() => {
            setStepForm(null);
            setNotice('Đã lưu bước duyệt.');
            load();
          }}
        />
      )}
    </>
  );
}

function WorkflowModal({ workflow, onClose, onSaved }) {
  const editing = Boolean(workflow);
  const [form, setForm] = useState({
    name: workflow?.name ?? '',
    description: workflow?.description ?? '',
    type: workflow?.type ?? 'SEQUENTIAL',
    actionType: workflow?.actionType ?? 'ASSIGNMENT',
    active: workflow?.active ?? true,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { ...form, name: form.name.trim(), description: form.description.trim() };
      if (editing) await workflowApi.update(workflow.id, payload);
      else await workflowApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa quy trình ${workflow.name}` : 'Thêm quy trình'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="wf-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>

      <div className="alert alert-info">
        Mỗi loại hành động chỉ được có một quy trình đang bật. Bật quy trình mới trong khi quy
        trình cũ còn bật sẽ bị từ chối do ràng buộc duy nhất ở cơ sở dữ liệu.
      </div>

      <form id="wf-form" onSubmit={submit}>
        <Field label="Tên quy trình" required>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            required
          />
        </Field>
        <Field label="Mô tả">
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
        <Field label="Áp dụng cho hành động" required>
          <select
            value={form.actionType}
            onChange={(e) => setForm({ ...form, actionType: e.target.value })}
          >
            <option value="ASSIGNMENT">Cấp phát / mượn</option>
            <option value="DISPOSAL">Thanh lý</option>
          </select>
        </Field>
        <Field
          label="Kiểu duyệt"
          required
          hint="Tuần tự: hết bước này mới sang bước sau. Song song: các bước cùng số thứ tự duyệt đồng thời."
        >
          <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
            <option value="SEQUENTIAL">Tuần tự</option>
            <option value="PARALLEL">Song song</option>
          </select>
        </Field>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              style={{ width: 'auto' }}
            />
            Đang bật
          </label>
        </div>
      </form>
    </Modal>
  );
}

function StepModal({
  step,
  workflow,
  roles,
  departments,
  branches,
  nextOrder,
  onClose,
  onSaved,
}) {
  const editing = Boolean(step);
  const [form, setForm] = useState({
    roleId: String(step?.roleId ?? ''),
    stepOrder: String(step?.stepOrder ?? nextOrder),
    departmentScope: step?.departmentScope ?? 'REQUESTER_DEPARTMENT',
    departmentId: String(step?.departmentId ?? ''),
    branchId: String(step?.branchId ?? ''),
    minValue: step?.minValue ?? '',
    maxValue: step?.maxValue ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const needsDepartment = form.departmentScope === 'SPECIFIC_DEPARTMENT';
  const needsBranch = form.departmentScope === 'SPECIFIC_BRANCH';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        workflowId: workflow.id,
        roleId: Number(form.roleId),
        stepOrder: Number(form.stepOrder),
        departmentScope: form.departmentScope,
        departmentId: needsDepartment ? Number(form.departmentId) : null,
        branchId: needsBranch ? Number(form.branchId) : null,
        minValue: form.minValue === '' ? null : Number(form.minValue),
        maxValue: form.maxValue === '' ? null : Number(form.maxValue),
      };
      if (editing) await stepApi.update(step.id, payload);
      else await stepApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa bước ${step.stepOrder}` : `Thêm bước vào "${workflow.name}"`}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="step-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>

      <form id="step-form" onSubmit={submit}>
        <div className="form-grid">
          <Field
            label="Số thứ tự bước"
            required
            hint={
              workflow.type === 'PARALLEL'
                ? 'Dùng chung số với bước khác để duyệt song song.'
                : 'Bước nhỏ hơn được duyệt trước.'
            }
          >
            <input
              type="number"
              min="1"
              value={form.stepOrder}
              onChange={(e) => setForm({ ...form, stepOrder: e.target.value })}
              required
            />
          </Field>

          <Field label="Vai trò duyệt" required>
            <select
              value={form.roleId}
              onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              required
            >
              <option value="">Chọn vai trò</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </Field>

          <Field
            label="Phạm vi người duyệt"
            required
            hint="Quyết định ai trong tổ chức đủ điều kiện duyệt bước này."
          >
            <select
              value={form.departmentScope}
              onChange={(e) => setForm({ ...form, departmentScope: e.target.value })}
            >
              {SCOPES.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>

          {needsDepartment && (
            <Field label="Phòng ban cụ thể" required>
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
          )}

          {needsBranch && (
            <Field label="Chi nhánh cụ thể" required>
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
          )}

          <Field
            label="Giá trị tối thiểu"
            hint="Bỏ trống nếu bước này luôn áp dụng. Với tài sản theo lô, tính trên tổng giá trị."
          >
            <input
              type="number"
              min="0"
              step="1000"
              value={form.minValue}
              onChange={(e) => setForm({ ...form, minValue: e.target.value })}
              placeholder="Không giới hạn"
            />
          </Field>

          <Field label="Giá trị tối đa" hint="Bỏ trống nếu không có trần.">
            <input
              type="number"
              min="0"
              step="1000"
              value={form.maxValue}
              onChange={(e) => setForm({ ...form, maxValue: e.target.value })}
              placeholder="Không giới hạn"
            />
          </Field>
        </div>
      </form>
    </Modal>
  );
}

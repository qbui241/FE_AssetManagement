import { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { assetApi, attributeApi, categoryApi, departmentApi, userApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import {
  Alert,
  Field,
  Loading,
  Modal,
  Panel,
  allowedRequestActionTypesFor,
  assetStatusLabel,
  canEditAsset,
  deptLabel,
} from '../components/ui';
import RequestModal from '../components/RequestModal';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  // Trang chi tiet dung chung cho xem va sua: vao tu "/assets/:id/edit" moi
  // duoc sua, vao tu "/assets/:id" (bam ten tai san) chi xem (readOnly).
  const editMode = location.pathname.endsWith('/edit');
  const { hasRole, user } = useAuth();
  const confirm = useConfirm();
  const toast = useToast();

  const isAdmin = hasRole('ADMIN');
  const canManage = hasRole('MANAGER', 'DIRECTOR');
  const isDirector = hasRole('DIRECTOR');

  const [asset, setAsset] = useState(null);

  // canEditAsset(asset, user, hasRole) trong ui.jsx da gop du ca 3 tang
  // quyen - khop dung validateDepartmentAssignment() ben AssetService.updateAsset()
  // (BE): ADMIN khong gioi han, DIRECTOR chi trong CHI NHANH, MANAGER chi
  // trong PHONG BAN. An nut Sua / khoa form edit o FE de nguoi dung khong
  // bam vao roi nhan loi 403 (giong cach da xu ly voi option "Thanh ly"
  // trong RequestModal). asset con null truoc khi load xong thi ham nay tu
  // tra false, khong can tu guard rieng o day.
  const canEdit = editMode && canEditAsset(asset, user, hasRole);
  const readOnly = !canEdit;

  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [defs, setDefs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState(null);
  const [attrValues, setAttrValues] = useState({});
  const [showRequest, setShowRequest] = useState(false);
  const [showAssignQty, setShowAssignQty] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    assetApi
      .get(id)
      .then((a) => {
        setAsset(a);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  useEffect(() => {
    if (canManage || isAdmin) {
      categoryApi.list().then(setCategories).catch(() => { });
      departmentApi.list().then(setDepartments).catch(() => { });
    }
    if (isAdmin) {
      // Chi dung de chon nguoi trong dropdown, khong hien bang -> lay het trong
      // gioi han cua backend thay vi phan trang.
      userApi.listAll().then((res) => setUsers(res.content)).catch(() => setUsers([]));
    }
  }, [canManage, isAdmin]);

  // Dung chung 1 ham de dung form/attrValues tu asset - goi khi load() xong
  // (useEffect ben duoi) VA khi huy sua (resetFormFromAsset) de khong bi dinh
  // lai gia tri dang go dang vao man view sau khi Huy.
  const resetFormFromAsset = useCallback((a) => {
    if (!a) return;
    setForm({
      assetCode: a.assetCode ?? '',
      name: a.name ?? '',
      serialNumber: a.serialNumber ?? '',
      trackingType: a.trackingType ?? 'INDIVIDUAL',
      quantity: a.quantity ?? '',
      value: a.value ?? '',
      purchaseDate: a.purchaseDate ?? '',
      categoryId: String(a.categoryId ?? ''),
      departmentId: String(a.departmentId ?? ''),
      status: a.status,
      assignUserId: '',
    });
    const seed = {};
    (a.attributes ?? []).forEach((attr) => {
      seed[attr.attributeDefinitionId] = attr.value ?? '';
    });
    setAttrValues(seed);
  }, []);

  // Nap lai form moi khi asset (tai) thay doi - vd sau khi luu va load() lai.
  useEffect(() => {
    resetFormFromAsset(asset);
  }, [asset, resetFormFromAsset]);

  // Bam Huy (o edit mode): bo het thay doi dang go dang, tra form ve dung
  // du lieu da luu (asset goc) truoc khi chuyen ve man view - khong thi man
  // view se hien nham gia tri dang sua dang bi huy.
  const cancelEdit = () => {
    resetFormFromAsset(asset);
    navigate(`/assets/${id}`, { replace: true });
  };

  // Nap dinh nghia thuoc tinh moi khi doi danh muc.
  useEffect(() => {
    if (!form?.categoryId) {
      setDefs([]);
      return;
    }
    attributeApi
      .byCategory(form.categoryId)
      .then((res) => setDefs(res ?? []))
      .catch(() => setDefs([]));
  }, [form?.categoryId]);

  if (loading || !form) return <Loading />;
  if (!asset) return <Alert kind="error">{error || 'Không tìm thấy tài sản.'}</Alert>;

  const isBulk = form.trackingType === 'BULK';
  // Giong Assets.jsx: dung chung allowedRequestActionTypes() de khong lech
  // nhau giua 2 trang - tai san o RETURNED van gui duoc (yeu cau thanh ly).
  // Giao ca trang thai asset lan role/pham vi nguoi dung hien tai - xem giai
  // thich day du trong Assets.jsx (cung 1 helper allowedRequestActionTypesFor).
  const canRequest = allowedRequestActionTypesFor(asset, user, hasRole).length > 0;

  // Cac trang thai duoc phep chon trong dropdown - mirror DUNG 1:1 switch
  // isValidTransition() ben BE (AssetService) de khong lech nhau: moi nhanh
  // o day ung voi dung 1 nhanh ben do, kem endpoint + role duoc phep goi.
  const statusOptions = new Set([asset.status]);
  if (canEdit && !isBulk) {
    switch (asset.status) {
      case 'AVAILABLE':
        if (canManage) statusOptions.add('MAINTENANCE'); // POST /maintenance
        if (isAdmin) statusOptions.add('ASSIGNED'); // POST /assign
        break;
      case 'ASSIGNED':
        if (canManage) statusOptions.add('RETURNED'); // POST /return
        break;
      case 'MAINTENANCE':
        if (canManage) statusOptions.add('RETURNED'); // POST /return
        break;
      case 'RETURNED':
        if (canManage) {
          statusOptions.add('AVAILABLE'); // POST /available
          statusOptions.add('MAINTENANCE'); // POST /maintenance
        }
        if (isAdmin) statusOptions.add('DISPOSED'); // POST /dispose - chi tu RETURNED
        break;
      default:
        break; // DISPOSED: khong co transition hop le nao
    }
  }
  const assigningNow = form.status === 'ASSIGNED' && asset.status !== 'ASSIGNED';

  const submit = async (e) => {
    e.preventDefault();
    if (!canEdit) return;

    if (form.status === 'DISPOSED' && asset.status !== 'DISPOSED') {
      const ok = await confirm({
        title: 'Thanh lý tài sản',
        message: 'Thanh lý tài sản này? Thao tác bỏ qua quy trình duyệt.',
        confirmText: 'Thanh lý',
        danger: true,
      });
      if (!ok) return;
    }

    setError('');
    setBusy(true);
    try {
      const payload = {
        assetCode: form.assetCode.trim(),
        name: form.name.trim(),
        // Backend co unique constraint tren serial_number, nen chuoi rong phai
        // gui la null de nhieu asset BULK khong dung do nhau.
        serialNumber: isBulk || !form.serialNumber.trim() ? null : form.serialNumber.trim(),
        trackingType: form.trackingType,
        quantity: isBulk ? Number(form.quantity) : null,
        value: Number(form.value),
        purchaseDate: form.purchaseDate,
        categoryId: Number(form.categoryId),
        departmentId: Number(form.departmentId),
        attributes: defs
          .map((d) => ({
            attributeDefinitionId: d.id,
            value: (attrValues[d.id] ?? '').trim(),
          }))
          .filter((a) => a.value !== ''),
      };
      await assetApi.update(asset.id, payload);

      if (form.status !== asset.status) {
        if (form.status === 'RETURNED') await assetApi.returnAsset(asset.id);
        else if (form.status === 'MAINTENANCE') await assetApi.maintenance(asset.id);
        else if (form.status === 'AVAILABLE') await assetApi.makeAvailable(asset.id);
        else if (form.status === 'DISPOSED') await assetApi.dispose(asset.id);
        else if (form.status === 'ASSIGNED') await assetApi.assign(asset.id, Number(form.assignUserId));
      }

      toast.success('Đã lưu tài sản.');
      load();
      navigate(`/assets/${id}`, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const removeAsset = async () => {
    const ok = await confirm({
      title: 'Xoá tài sản',
      message: `Xoá hẳn tài sản ${asset.assetCode}? Thao tác này không hoàn tác được.`,
      confirmText: 'Xoá',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    try {
      await assetApi.remove(asset.id);
      toast.success('Đã xoá tài sản.');
      navigate('/assets');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>

      <Panel
        title={editMode ? `Sửa tài sản ${asset.assetCode}` : asset.name}
        description={editMode ? asset.assetCode : undefined}
        actions={
          <>
            <button
              className="btn btn-lg"
              onClick={editMode ? cancelEdit : () => navigate('/assets')}
            >
              {editMode ? 'Huỷ' : 'Quay lại'}
            </button>
            {!editMode && canEditAsset(asset, user, hasRole) && (
              <button className="btn btn-lg" onClick={() => navigate(`/assets/${id}/edit`)}>
                Sửa
              </button>
            )}
            {!editMode && canRequest && (
              <button className="btn btn-lg btn-primary" onClick={() => setShowRequest(true)}>
                Gửi yêu cầu
              </button>
            )}
          </>
        }
      >
        {editMode && readOnly && (
          <div className="alert alert-info">Bạn không có quyền sửa tài sản này.</div>
        )}

        <form id="asset-form" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Mã tài sản" required>
              <input
                value={form.assetCode}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
                required
              />
            </Field>
            <Field label="Tên tài sản" required>
              <input
                value={form.name}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </Field>

            <Field label="Trạng thái" required>
              <select
                value={form.status}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, status: e.target.value, assignUserId: '' })}
              >
                {[...statusOptions].map((s) => (
                  <option key={s} value={s}>
                    {assetStatusLabel(s)}
                  </option>
                ))}
              </select>
            </Field>
            {assigningNow && (
              <Field label="Cấp cho" required hint="Bỏ qua quy trình duyệt, được ghi vào nhật ký.">
                {users.length ? (
                  <select
                    value={form.assignUserId}
                    onChange={(e) => setForm({ ...form, assignUserId: e.target.value })}
                    required
                  >
                    <option value="">Chọn người nhận</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.username})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min="1"
                    value={form.assignUserId}
                    onChange={(e) => setForm({ ...form, assignUserId: e.target.value })}
                    placeholder="Mã người dùng"
                    required
                  />
                )}
              </Field>
            )}

            <Field
              label="Cách quản lý"
              required
              hint={
                isBulk
                  ? 'Trừ dần theo số lượng, không cần serial.'
                  : 'Mỗi tài sản là một đơn vị riêng, theo dõi bằng serial.'
              }
            >
              <select value={form.trackingType} disabled>
                <option value="INDIVIDUAL">Theo serial</option>
                <option value="BULK">Theo số lượng</option>
              </select>
            </Field>

            {isBulk ? (
              <Field label="Số lượng" required>
                <input
                  type="number"
                  min="1"
                  value={form.quantity}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  required
                />
              </Field>
            ) : (
              <Field label="Số serial">
                <input
                  value={form.serialNumber}
                  disabled={readOnly}
                  onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                  placeholder="Để trống nếu chưa có"
                />
              </Field>
            )}

            <Field label={isBulk ? 'Đơn giá' : 'Giá trị'} required>
              <input
                type="number"
                min="1"
                step="1"
                value={form.value}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                required
              />
            </Field>
            <Field label="Ngày mua" required>
              <input
                type="date"
                value={form.purchaseDate}
                disabled={readOnly}
                onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
                required
              />
            </Field>

            <Field label="Danh mục" required>
              <select
                value={form.categoryId}
                disabled={readOnly}
                onChange={(e) => {
                  setForm({ ...form, categoryId: e.target.value });
                  setAttrValues({});
                }}
                required
              >
                <option value="">Chọn danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phòng ban quản lý" required>
              <select
                value={form.departmentId}
                disabled={readOnly}
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

            {!isBulk && (
              <Field label="Đang giữ">
                <input value={asset.assignedToName || '—'} disabled />
              </Field>
            )}
          </div>

          {defs.length > 0 && (
            <>
              <h3 style={{ margin: '10px 0 12px', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
                Thông số kỹ thuật
              </h3>
              <div className="form-grid">
                {defs.map((d) => (
                  <Field key={d.id} label={d.label} required={d.required}>
                    {d.dataType === 'BOOLEAN' ? (
                      <select
                        value={attrValues[d.id] ?? ''}
                        disabled={readOnly}
                        onChange={(e) => setAttrValues({ ...attrValues, [d.id]: e.target.value })}
                        required={d.required}
                      >
                        <option value="">Chọn</option>
                        <option value="true">Có</option>
                        <option value="false">Không</option>
                      </select>
                    ) : (
                      <input
                        type={
                          d.dataType === 'NUMBER' ? 'number' : d.dataType === 'DATE' ? 'date' : 'text'
                        }
                        value={attrValues[d.id] ?? ''}
                        disabled={readOnly}
                        onChange={(e) => setAttrValues({ ...attrValues, [d.id]: e.target.value })}
                        required={d.required}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </>
          )}

          {/* Cap phat theo so luong (BULK) khong phai mot trang thai don le - mot
              tai san BULK co the cap phat cho nhieu nguoi cung luc nen tach rieng
              khoi dropdown Trang thai. */}
          {canEdit && isAdmin && isBulk && asset.availableQuantity > 0 && (
            <div className="btn-row" style={{ marginTop: 14 }}>
              <button type="button" className="btn" disabled={busy} onClick={() => setShowAssignQty(true)}>
                Cấp phát số lượng
              </button>
            </div>
          )}

          {canEdit && (
            <div
              className="btn-row"
              style={{ marginTop: 18, paddingTop: 14, borderTop: '1px solid var(--line)' }}
            >
              <button type="submit" className="btn btn-primary" disabled={busy}>
                {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
              </button>
              {isDirector && (
                <button
                  type="button"
                  className="btn btn-danger"
                  disabled={busy}
                  style={{ marginLeft: 'auto' }}
                  onClick={removeAsset}
                >
                  Xoá tài sản
                </button>
              )}
            </div>
          )}
        </form>
      </Panel>

      {showRequest && (
        <RequestModal
          asset={asset}
          onClose={() => setShowRequest(false)}
          onCreated={(req) => {
            setShowRequest(false);
            navigate(`/requests/${req.id}`);
          }}
        />
      )}

      {showAssignQty && (
        <AssignQuantityModal
          asset={asset}
          users={users}
          onClose={() => setShowAssignQty(false)}
          onDone={() => {
            setShowAssignQty(false);
            toast.success('Đã cấp phát.');
            load();
          }}
        />
      )}
    </>
  );
}

/* ---------- ADMIN cap phat theo so luong (BULK) ---------- */

function AssignQuantityModal({ asset, users, onClose, onDone }) {
  const [userId, setUserId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await assetApi.assignQuantity(asset.id, Number(userId), Number(quantity));
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Cấp phát số lượng"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button form="assign-qty-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang cấp phát…' : 'Cấp phát'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>
      <div className="alert alert-info">
        Thao tác này bỏ qua toàn bộ quy trình duyệt và được ghi vào nhật ký hệ thống.
      </div>
      <form id="assign-qty-form" onSubmit={submit}>
        <Field label="Cấp cho" required>
          {users.length ? (
            <select value={userId} onChange={(e) => setUserId(e.target.value)} required>
              <option value="">Chọn người nhận</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.username})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min="1"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder="Mã người dùng"
              required
            />
          )}
        </Field>
        <Field label="Số lượng" required hint={`Còn lại ${asset.availableQuantity} đơn vị.`}>
          <input
            type="number"
            min="1"
            max={asset.availableQuantity}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </Field>
      </form>
    </Modal>
  );
}
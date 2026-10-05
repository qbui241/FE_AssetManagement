import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { assetApi, categoryApi, departmentApi, userApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  AssetStatusBadge,
  Field,
  Loading,
  Modal,
  Panel,
  TrackingBadge,
  formatDate,
  formatMoney,
} from '../components/ui';
import AssetFormModal from '../components/AssetFormModal';
import RequestModal from '../components/RequestModal';

export default function AssetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const isAdmin = hasRole('ADMIN');
  const canManage = hasRole('MANAGER', 'DIRECTOR');
  const isDirector = hasRole('DIRECTOR');

  const [asset, setAsset] = useState(null);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [showRequest, setShowRequest] = useState(false);
  const [showAssign, setShowAssign] = useState(false);

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
    if (canManage) {
      categoryApi.list().then(setCategories).catch(() => { });
      departmentApi.list().then(setDepartments).catch(() => { });
    }
    if (isAdmin) {
      // Chi dung de chon nguoi trong dropdown, khong hien bang -> lay het trong
      // gioi han cua backend thay vi phan trang.
      userApi.listAll().then((res) => setUsers(res.content)).catch(() => setUsers([]));
    }
  }, [canManage, isAdmin]);

  const act = async (fn, successMessage) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await fn();
      setNotice(successMessage);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (!asset) return <Alert kind="error">{error || 'Không tìm thấy tài sản.'}</Alert>;

  const isBulk = asset.trackingType === 'BULK';
  const canRequest = isBulk
    ? asset.status !== 'DISPOSED' && asset.availableQuantity > 0
    : asset.status === 'AVAILABLE';

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>
      <Alert kind="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>

      <Panel
        title={asset.name}
        description={asset.assetCode}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => navigate('/assets')}>
              Quay lại
            </button>
            {canManage && (
              <button className="btn btn-sm" onClick={() => setShowEdit(true)}>
                Sửa
              </button>
            )}
            {canRequest && (
              <button className="btn btn-sm btn-primary" onClick={() => setShowRequest(true)}>
                Gửi yêu cầu
              </button>
            )}
          </>
        }
      >
        <div className="detail-grid">
          <Item k="Trạng thái" v={<AssetStatusBadge status={asset.status} />} />
          <Item k="Cách quản lý" v={<TrackingBadge type={asset.trackingType} />} />
          <Item k={isBulk ? 'Đơn giá' : 'Giá trị'} v={formatMoney(asset.value)} />
          {isBulk && (
            <Item
              k="Tồn kho"
              v={
                <>
                  {asset.availableQuantity}
                  <span style={{ color: 'var(--ink-faint)' }}> / {asset.quantity}</span>
                </>
              }
            />
          )}
          {!isBulk && <Item k="Số serial" v={<span className="mono">{asset.serialNumber || '—'}</span>} />}
          <Item k="Danh mục" v={asset.categoryName} />
          <Item k="Phòng ban" v={asset.departmentName} />
          <Item k="Ngày mua" v={formatDate(asset.purchaseDate)} />
          {!isBulk && <Item k="Đang giữ" v={asset.assignedToName || '—'} />}
        </div>
      </Panel>

      {asset.attributes?.length > 0 && (
        <Panel title="Thông số kỹ thuật">
          <div className="detail-grid">
            {asset.attributes.map((a) => (
              <Item
                key={a.attributeDefinitionId}
                k={a.label}
                v={a.dataType === 'BOOLEAN' ? (a.value === 'true' ? 'Có' : 'Không') : a.value || '—'}
              />
            ))}
          </div>
        </Panel>
      )}

      {(canManage || isAdmin) && (
        <Panel
          title="Thao tác vòng đời"
          description={
            isAdmin
              ? 'Thao tác của ADMIN bỏ qua quy trình duyệt và đều được ghi vào nhật ký.'
              : 'Chuyển trạng thái tài sản theo vòng đời đã cấu hình.'
          }
        >
          <div className="btn-row">
            {canManage && !isBulk && asset.status === 'ASSIGNED' && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => act(() => assetApi.returnAsset(asset.id), 'Đã thu hồi tài sản.')}
              >
                Thu hồi
              </button>
            )}
            {canManage && ['AVAILABLE', 'RETURNED'].includes(asset.status) && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => act(() => assetApi.maintenance(asset.id), 'Đã chuyển sang bảo trì.')}
              >
                Chuyển bảo trì
              </button>
            )}
            {canManage && ['MAINTENANCE', 'RETURNED'].includes(asset.status) && (
              <button
                className="btn"
                disabled={busy}
                onClick={() => act(() => assetApi.makeAvailable(asset.id), 'Tài sản đã sẵn sàng.')}
              >
                Đánh dấu sẵn sàng
              </button>
            )}
            {isAdmin && !isBulk && asset.status === 'AVAILABLE' && (
              <button className="btn" disabled={busy} onClick={() => setShowAssign(true)}>
                Cấp phát trực tiếp
              </button>
            )}
            {isAdmin && isBulk && asset.availableQuantity > 0 && (
              <button className="btn" disabled={busy} onClick={() => setShowAssign(true)}>
                Cấp phát số lượng
              </button>
            )}
            {isAdmin && !isBulk && asset.status !== 'DISPOSED' && (
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => {
                  if (confirm('Thanh lý tài sản này? Thao tác bỏ qua quy trình duyệt.')) {
                    act(() => assetApi.dispose(asset.id), 'Đã thanh lý tài sản.');
                  }
                }}
              >
                Thanh lý trực tiếp
              </button>
            )}
            {isDirector && (
              <button
                className="btn btn-danger"
                disabled={busy}
                onClick={() => {
                  if (confirm(`Xoá hẳn tài sản ${asset.assetCode}?`)) {
                    act(async () => {
                      await assetApi.remove(asset.id);
                      navigate('/assets');
                    }, 'Đã xoá tài sản.');
                  }
                }}
              >
                Xoá tài sản
              </button>
            )}
          </div>
        </Panel>
      )}

      {showEdit && (
        <AssetFormModal
          asset={asset}
          categories={categories}
          departments={departments}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false);
            setNotice('Đã cập nhật tài sản.');
            load();
          }}
        />
      )}

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

      {showAssign && (
        <AssignModal
          asset={asset}
          users={users}
          onClose={() => setShowAssign(false)}
          onDone={() => {
            setShowAssign(false);
            setNotice('Đã cấp phát tài sản.');
            load();
          }}
        />
      )}
    </>
  );
}

function Item({ k, v }) {
  return (
    <div className="item">
      <div className="k">{k}</div>
      <div className="v">{v}</div>
    </div>
  );
}

/* ---------- ADMIN cap phat truc tiep ---------- */

function AssignModal({ asset, users, onClose, onDone }) {
  const isBulk = asset.trackingType === 'BULK';
  const [userId, setUserId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (isBulk) await assetApi.assignQuantity(asset.id, Number(userId), Number(quantity));
      else await assetApi.assign(asset.id, Number(userId));
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Cấp phát trực tiếp"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button form="assign-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang cấp phát…' : 'Cấp phát'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>
      <div className="alert alert-info">
        Thao tác này bỏ qua toàn bộ quy trình duyệt và được ghi vào nhật ký hệ thống.
      </div>
      <form id="assign-form" onSubmit={submit}>
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
        {isBulk && (
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
        )}
      </form>
    </Modal>
  );
}

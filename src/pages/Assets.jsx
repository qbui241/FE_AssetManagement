import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assetApi, categoryApi, departmentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  AssetStatusBadge,
  Empty,
  Loading,
  Panel,
  TrackingBadge,
  formatMoney,
} from '../components/ui';
import { IconEye, IconPencil, IconSend, IconTrash } from '../components/icons';
import AssetFormModal from '../components/AssetFormModal';
import RequestModal from '../components/RequestModal';

const STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETURNED', 'DISPOSED'];
const STATUS_LABEL = {
  AVAILABLE: 'Sẵn sàng',
  ASSIGNED: 'Đang cấp phát',
  MAINTENANCE: 'Bảo trì',
  RETURNED: 'Đã thu hồi',
  DISPOSED: 'Đã thanh lý',
};

// Cung dieu kien voi trang chi tiet: BULK con ton kho, INDIVIDUAL phai AVAILABLE.
function canRequestAsset(a) {
  return a.trackingType === 'BULK'
    ? a.status !== 'DISPOSED' && a.availableQuantity > 0
    : a.status === 'AVAILABLE';
}

export default function Assets() {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const canWrite = hasRole('MANAGER', 'DIRECTOR');
  const canDelete = hasRole('DIRECTOR');

  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [requesting, setRequesting] = useState(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tracking, setTracking] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      assetApi.list(),
      categoryApi.list().catch(() => []),
      departmentApi.list().catch(() => []),
    ])
      .then(([a, c, d]) => {
        setAssets(Array.isArray(a) ? a : a?.content ?? []);
        setCategories(Array.isArray(c) ? c : c?.content ?? []);
        setDepartments(Array.isArray(d) ? d : d?.content ?? []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return assets.filter((a) => {
      if (status && a.status !== status) return false;
      if (categoryId && String(a.categoryId) !== categoryId) return false;
      if (tracking && a.trackingType !== tracking) return false;
      if (!needle) return true;
      return [a.assetCode, a.name, a.serialNumber, a.categoryName, a.departmentName]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [assets, q, status, categoryId, tracking]);

  const remove = async (asset) => {
    if (!confirm(`Xoá hẳn tài sản ${asset.assetCode}? Thao tác này không hoàn tác được.`)) return;
    setBusyId(asset.id);
    setError('');
    setNotice('');
    try {
      await assetApi.remove(asset.id);
      setNotice(`Đã xoá ${asset.assetCode}.`);
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
        title={`Tài sản (${filtered.length})`}
        actions={
          canWrite && (
            <button className="btn btn-primary btn-lg" onClick={() => setCreating(true)}>
              Thêm tài sản
            </button>
          )
        }
        bodyless
      >
        <div className="panel-body" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="filters">
            <input
              placeholder="Tìm theo mã, tên, serial…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 230 }}
            />
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">Mọi trạng thái</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Mọi danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={tracking} onChange={(e) => setTracking(e.target.value)}>
              <option value="">Mọi cách quản lý</option>
              <option value="INDIVIDUAL">Theo serial</option>
              <option value="BULK">Theo số lượng</option>
            </select>
            {(q || status || categoryId || tracking) && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setQ('');
                  setStatus('');
                  setCategoryId('');
                  setTracking('');
                }}
              >
                Xoá bộ lọc
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty
            title={assets.length ? 'Không có tài sản khớp bộ lọc' : 'Chưa có tài sản nào'}
            hint={assets.length ? 'Thử nới bộ lọc hoặc xoá từ khoá tìm kiếm.' : undefined}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Danh mục</th>
                  <th>Quản lý</th>
                  <th className="num">Giá trị</th>
                  <th className="num">Số lượng</th>
                  <th>Phòng ban</th>
                  <th>Trạng thái</th>
                  <th className="actions-col">Thao tác</th>
                  <th className="actions-col">Yêu cầu</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const requestable = canRequestAsset(a);
                  return (
                    <tr key={a.id}>
                      <td className="mono">{a.assetCode}</td>
                      <td>
                        <div className="cell-title">
                          <Link to={`/assets/${a.id}`}>{a.name}</Link>
                        </div>
                        {a.serialNumber && <div className="cell-sub mono">{a.serialNumber}</div>}
                      </td>
                      <td>{a.categoryName}</td>
                      <td>
                        <TrackingBadge type={a.trackingType} />
                      </td>
                      <td className="num">{formatMoney(a.value)}</td>
                      <td className="num">
                        {a.trackingType === 'BULK' ? (
                          <>
                            {a.availableQuantity}
                            <span style={{ color: 'var(--ink-faint)' }}>/{a.quantity}</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{a.departmentName}</td>
                      <td>
                        <AssetStatusBadge status={a.status} />
                      </td>

                      <td className="actions-col">
                        <div className="row-actions">
                          <button
                            className="icon-btn"
                            title="Xem chi tiết"
                            aria-label={`Xem chi tiết ${a.assetCode}`}
                            onClick={() => navigate(`/assets/${a.id}`)}
                          >
                            <IconEye />
                          </button>
                          {canWrite && (
                            <button
                              className="icon-btn"
                              title="Sửa tài sản"
                              aria-label={`Sửa ${a.assetCode}`}
                              disabled={busyId === a.id}
                              onClick={() => setEditing(a)}
                            >
                              <IconPencil />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              className="icon-btn danger"
                              title="Xoá tài sản"
                              aria-label={`Xoá ${a.assetCode}`}
                              disabled={busyId === a.id}
                              onClick={() => remove(a)}
                            >
                              <IconTrash />
                            </button>
                          )}
                        </div>
                      </td>

                      <td className="actions-col">
                        <div className="row-actions">
                          <button
                            className="icon-btn primary"
                            title={
                              requestable
                                ? 'Gửi yêu cầu cho tài sản này'
                                : a.trackingType === 'BULK'
                                  ? 'Hết số lượng khả dụng'
                                  : 'Chỉ gửi được khi tài sản đang Sẵn sàng'
                            }
                            aria-label={`Gửi yêu cầu cho ${a.assetCode}`}
                            disabled={!requestable}
                            onClick={() => setRequesting(a)}
                          >
                            <IconSend />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && (
        <AssetFormModal
          categories={categories}
          departments={departments}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            setNotice('Đã thêm tài sản.');
            load();
          }}
        />
      )}

      {editing && (
        <AssetFormModal
          asset={editing}
          categories={categories}
          departments={departments}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            setNotice('Đã cập nhật tài sản.');
            load();
          }}
        />
      )}

      {requesting && (
        <RequestModal
          asset={requesting}
          onClose={() => setRequesting(null)}
          onCreated={(req) => {
            setRequesting(null);
            navigate(`/requests/${req.id}`);
          }}
        />
      )}
    </>
  );
}

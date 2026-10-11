import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { assetApi, categoryApi, departmentApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../components/ConfirmDialog';
import { useToast } from '../components/ToastProvider';
import {
  Alert,
  AssetStatusBadge,
  Empty,
  Loading,
  Pagination,
  Panel,
  TrackingBadge,
  allowedRequestActionTypes,
  allowedRequestActionTypesFor,
  canEditAsset as canEditAssetFor,
  formatMoney,
  useDebouncedValue,
} from '../components/ui';
import { IconPencil, IconSend, IconTrash } from '../components/icons';
import AssetFormModal from '../components/AssetFormModal';
import RequestModal from '../components/RequestModal';

const PAGE_SIZE = 20;
const STATUSES = ['AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETURNED', 'DISPOSED'];
const STATUS_LABEL = {
  AVAILABLE: 'Sẵn sàng',
  ASSIGNED: 'Đang cấp phát',
  MAINTENANCE: 'Bảo trì',
  RETURNED: 'Đã thu hồi',
  DISPOSED: 'Đã thanh lý',
};

export default function Assets() {
  const navigate = useNavigate();
  const { hasRole, user } = useAuth();
  const canWrite = hasRole('MANAGER', 'DIRECTOR', 'ADMIN');
  const confirm = useConfirm();
  const toast = useToast();
  const canDelete = hasRole('DIRECTOR', 'ADMIN');

  // Tai san con GUI duoc yeu cau (bat ky loai nao - muon hay thanh ly) khi va
  // chi khi co it nhat 1 ActionType ma NGUOI DUNG HIEN TAI duoc phep gui -
  // giao ca trang thai asset (allowedRequestActionTypes) lan role/pham vi
  // nguoi gui (canRequestDisposal, rieng cho DISPOSAL). Truoc day chi check
  // status === AVAILABLE nen tai san o RETURNED (dang cho thanh ly) bi khoa
  // nut gui luon; sau do lai chi check theo trang thai, khong check quyen,
  // nen 1 nguoi khong co quyen thanh ly van thay nut bam duoc roi mo modal ra
  // rong (khong co option nao). Gio giao ca 2 dieu kien ngay tu nut.
  const canRequestAsset = (a) => allowedRequestActionTypesFor(a, user, hasRole).length > 0;

  // canEditAsset(asset, user, hasRole) trong ui.jsx da tu check du ca 3 role
  // (ADMIN khong gioi han, DIRECTOR theo chi nhanh, MANAGER theo phong ban) -
  // khop dung validateDepartmentAssignment() o AssetService.updateAsset (BE),
  // nen o day chi can goi lai, khong phai tu viet dieu kien rieng nua.
  const canEditAsset = (a) => canEditAssetFor(a, user, hasRole);

  const [result, setResult] = useState(null);
  const [categories, setCategories] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [creating, setCreating] = useState(false);
  const [requesting, setRequesting] = useState(null);

  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [tracking, setTracking] = useState('');
  const [page, setPage] = useState(0);

  // Chi goi API sau khi nguoi dung ngung go, tranh 1 request cho moi phim bam.
  const keyword = useDebouncedValue(q.trim());

  const load = () => {
    setLoading(true);
    assetApi
      .list({ status, categoryId, trackingType: tracking, q: keyword, page, size: PAGE_SIZE })
      .then((res) => {
        setResult(res);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [status, categoryId, tracking, keyword, page]);

  useEffect(() => {
    categoryApi.list().then(setCategories).catch(() => setCategories([]));
    departmentApi.list().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  // Moi lan doi bo loc phai ve lai trang 0, khong thi co the dang o trang
  // khong ton tai voi ket qua loc moi (vd dang trang 3, loc con 1 trang).
  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  const filtered = result?.content ?? [];
  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;
  const hasFilters = Boolean(q || status || categoryId || tracking);

  const remove = async (asset) => {
    if (
      !(await confirm({
        title: 'Xoá tài sản',
        message: `Xoá hẳn tài sản ${asset.assetCode}? Thao tác này không hoàn tác được.`,
        confirmText: 'Xoá',
        danger: true,
      }))
    )
      return;
    setBusyId(asset.id);
    setError('');
    try {
      await assetApi.remove(asset.id);
      toast.success(`Đã xoá ${asset.assetCode}.`);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>

      <Panel
        title={`Tài sản (${totalElements})`}
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
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              style={{ minWidth: 230 }}
            />
            <select value={status} onChange={(e) => updateFilter(setStatus)(e.target.value)}>
              <option value="">Mọi trạng thái</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <select value={categoryId} onChange={(e) => updateFilter(setCategoryId)(e.target.value)}>
              <option value="">Mọi danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select value={tracking} onChange={(e) => updateFilter(setTracking)(e.target.value)}>
              <option value="">Mọi cách quản lý</option>
              <option value="INDIVIDUAL">Theo serial</option>
              <option value="BULK">Theo số lượng</option>
            </select>
            {hasFilters && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setQ('');
                  setStatus('');
                  setCategoryId('');
                  setTracking('');
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
        ) : filtered.length === 0 ? (
          <Empty
            title={hasFilters ? 'Không có tài sản khớp bộ lọc' : 'Chưa có tài sản nào'}
            hint={hasFilters ? 'Thử nới bộ lọc hoặc xoá từ khoá tìm kiếm.' : undefined}
          />
        ) : (
          <>
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
                    // Chi de phan biet tooltip: status cho phep nhung bi chan vi
                    // role/pham vi (vd RETURNED - hop le ve trang thai - nhung
                    // nguoi dung khong co quyen gui thanh ly).
                    const blockedByScope = !requestable && allowedRequestActionTypes(a).length > 0;
                    const editable = canEditAsset(a);
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
                            {editable && (
                              <button
                                className="icon-btn"
                                title="Sửa tài sản"
                                aria-label={`Sửa ${a.assetCode}`}
                                disabled={busyId === a.id}
                                onClick={() => navigate(`/assets/${a.id}/edit`)}
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
                                  : blockedByScope
                                    ? 'Bạn không có quyền gửi yêu cầu thanh lý cho tài sản này'
                                    : a.trackingType === 'BULK'
                                      ? 'Hết số lượng khả dụng'
                                      : 'Chỉ gửi được khi tài sản đang Sẵn sàng (mượn) hoặc Đã thu hồi (thanh lý)'
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

            <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onChange={setPage} />
          </>
        )}
      </Panel>

      {creating && (
        <AssetFormModal
          categories={categories}
          departments={departments}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            toast.success('Đã thêm tài sản.');
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
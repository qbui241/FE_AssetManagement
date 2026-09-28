import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { approvalRequestApi, approvalTaskApi, assetApi, dashboardApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  AssetStatusBadge,
  Empty,
  Loading,
  Panel,
  RequestStatusBadge,
  formatDateTime,
  formatMoney,
} from '../components/ui';

export default function Dashboard() {
  const { hasRole } = useAuth();
  const canApprove = hasRole('MANAGER', 'DIRECTOR');

  const [stats, setStats] = useState(null);
  const [availableAssets, setAvailableAssets] = useState([]);
  const [myRequests, setMyRequests] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    Promise.all([
      dashboardApi.stats().catch(() => null),
      assetApi.list().catch(() => []),
      approvalRequestApi.listMine().catch(() => []),
      canApprove ? approvalTaskApi.list({ status: 'PENDING' }).catch(() => []) : Promise.resolve([]),
    ])
      .then(([s, assets, r, t]) => {
        if (!alive) return;
        setStats(s);
        setAvailableAssets((assets ?? []).filter((a) => a.status === 'AVAILABLE'));
        setMyRequests(r ?? []);
        setTasks(t ?? []);
      })
      .catch((err) => alive && setError(err.message))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [canApprove]);

  if (loading) return <Loading />;

  const pendingMine = myRequests.filter((r) => r.status === 'PENDING').length;

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <div className="stat-grid">
        <div className="stat">
          <div className="label">Tổng số dòng tài sản</div>
          <div className="value">{stats?.totalAssetCount ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="label">Tổng đơn vị (kể cả BULK)</div>
          <div className="value">{stats?.totalUnits ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="label">Sẵn sàng cấp phát</div>
          <div className="value accent">{stats?.availableUnits ?? '—'}</div>
        </div>
        <div className="stat">
          <div className="label">Tổng giá trị</div>
          <div className="value">{stats ? formatMoney(stats.totalValue) : '—'}</div>
        </div>
        {canApprove && (
          <div className="stat">
            <div className="label">Chờ tôi duyệt</div>
            <div className="value pending">{tasks.length}</div>
          </div>
        )}
        <div className="stat">
          <div className="label">Yêu cầu của tôi đang chờ</div>
          <div className="value pending">{pendingMine}</div>
        </div>
      </div>

      {stats && (
        <div className="two-col">
          <Panel title="Theo trạng thái">
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {stats.byStatus.map((g) => (
                <div
                  key={g.label}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  <AssetStatusBadge status={g.label} />
                  <span className="num" style={{ fontWeight: 600 }}>
                    {g.totalUnits} đơn vị
                  </span>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Theo danh mục" bodyless>
            {stats.byCategory.length === 0 ? (
              <Empty title="Chưa có dữ liệu" />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Danh mục</th>
                      <th className="num">Đơn vị</th>
                      <th className="num">Sẵn sàng</th>
                      <th className="num">Giá trị</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byCategory.map((g) => (
                      <tr key={g.label}>
                        <td className="cell-title">{g.label}</td>
                        <td className="num">{g.totalUnits}</td>
                        <td className="num">{g.availableUnits}</td>
                        <td className="num">{formatMoney(g.totalValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {canApprove && (
        <Panel
          title="Chờ tôi duyệt"
          description="Các bước phê duyệt đang đợi quyết định của bạn"
          actions={
            tasks.length > 0 && (
              <Link className="btn btn-sm" to="/tasks">
                Xem tất cả
              </Link>
            )
          }
          bodyless
        >
          {tasks.length === 0 ? (
            <Empty title="Không có việc nào chờ bạn" hint="Mọi yêu cầu trong phạm vi của bạn đã được xử lý." />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Yêu cầu</th>
                    <th>Bước</th>
                    <th>Vai trò</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {tasks.slice(0, 5).map((t) => (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/requests/${t.approvalRequestId}`}>
                          Yêu cầu #{t.approvalRequestId}
                        </Link>
                      </td>
                      <td>Bước {t.stepOrder}</td>
                      <td>
                        <span className="badge badge-role">{t.roleName}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link className="btn btn-sm" to="/tasks">
                          Xử lý
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      )}

      <Panel
        title="Yêu cầu gần đây của tôi"
        actions={
          <Link className="btn btn-sm btn-primary" to="/assets">
            Tạo yêu cầu mới
          </Link>
        }
        bodyless
      >
        {myRequests.length === 0 ? (
          <Empty
            title="Bạn chưa gửi yêu cầu nào"
            hint="Mở trang Tài sản và chọn một tài sản để đề xuất cấp phát."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tài sản</th>
                  <th>Bước hiện tại</th>
                  <th>Trạng thái</th>
                  <th>Ngày gửi</th>
                </tr>
              </thead>
              <tbody>
                {myRequests.slice(0, 6).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/requests/${r.id}`}>#{r.id}</Link>
                    </td>
                    <td>
                      <div className="cell-title">{r.assetName}</div>
                      <div className="cell-sub mono">{r.assetCode}</div>
                    </td>
                    <td>Bước {r.currentStepOrder}</td>
                    <td>
                      <RequestStatusBadge status={r.status} />
                    </td>
                    <td>{formatDateTime(r.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="Tài sản sẵn sàng cấp phát" bodyless>
        {availableAssets.length === 0 ? (
          <Empty title="Không còn tài sản sẵn sàng" hint="Tất cả tài sản đang được cấp phát hoặc bảo trì." />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tên</th>
                  <th>Loại</th>
                  <th>Phòng ban</th>
                  <th className="num">Còn lại</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {availableAssets.slice(0, 6).map((a) => (
                  <tr key={a.id}>
                    <td className="mono">
                      <Link to={`/assets/${a.id}`}>{a.assetCode}</Link>
                    </td>
                    <td className="cell-title">{a.name}</td>
                    <td>{a.categoryName}</td>
                    <td>{a.departmentName}</td>
                    <td className="num">
                      {a.trackingType === 'BULK' ? `${a.availableQuantity}/${a.quantity}` : '1'}
                    </td>
                    <td>
                      <AssetStatusBadge status={a.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
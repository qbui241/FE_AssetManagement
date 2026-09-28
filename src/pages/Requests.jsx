import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { approvalRequestApi } from '../api/endpoints';
import {
  Alert,
  Empty,
  Loading,
  Panel,
  RequestStatusBadge,
  formatDateTime,
} from '../components/ui';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'];
const LABEL = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã huỷ',
};

export default function Requests({ scope = 'mine' }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => {
    setLoading(true);
    const fetcher = scope === 'all' ? approvalRequestApi.listAll : approvalRequestApi.listMine;
    fetcher()
      .then((res) => {
        setRequests(res ?? []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [scope]);

  const filtered = useMemo(
    () => (status ? requests.filter((r) => r.status === status) : requests),
    [requests, status]
  );

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={scope === 'all' ? `Tất cả yêu cầu (${filtered.length})` : `Yêu cầu của tôi (${filtered.length})`}
        actions={
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Mọi trạng thái</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {LABEL[s]}
              </option>
            ))}
          </select>
        }
        bodyless
      >
        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty
            title={requests.length ? 'Không có yêu cầu khớp bộ lọc' : 'Chưa có yêu cầu nào'}
            hint={
              requests.length
                ? undefined
                : scope === 'mine'
                  ? 'Mở trang Tài sản và chọn một tài sản để gửi đề xuất.'
                  : undefined
            }
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mã</th>
                  <th>Tài sản</th>
                  {scope === 'all' && <th>Người yêu cầu</th>}
                  <th>Quy trình</th>
                  <th className="num">SL</th>
                  <th>Bước</th>
                  <th>Trạng thái</th>
                  <th>Ngày gửi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Link to={`/requests/${r.id}`}>#{r.id}</Link>
                    </td>
                    <td>
                      <div className="cell-title">{r.assetName}</div>
                      <div className="cell-sub mono">{r.assetCode}</div>
                    </td>
                    {scope === 'all' && <td>{r.requesterName}</td>}
                    <td>{r.workflowName}</td>
                    <td className="num">{r.requestedQuantity ?? '—'}</td>
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
    </>
  );
}

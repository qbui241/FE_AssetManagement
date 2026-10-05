import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { approvalRequestApi } from '../api/endpoints';
import {
  Alert,
  Empty,
  Loading,
  Pagination,
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

const PAGE_SIZE = 20;

export default function Requests({ scope = 'mine' }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(0);

  useEffect(() => {
    // Bo qua phan hoi cu neu nguoi dung da doi bo loc/trang truoc khi no ve.
    let alive = true;
    setLoading(true);
    const fetcher = scope === 'all' ? approvalRequestApi.listAll : approvalRequestApi.listMine;
    fetcher({ status, page, size: PAGE_SIZE })
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
  }, [scope, status, page]);

  const requests = result?.content ?? [];
  const total = result?.totalElements ?? 0;

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={scope === 'all' ? `Tất cả yêu cầu (${total})` : `Yêu cầu của tôi (${total})`}
        actions={
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
            }}
          >
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
        ) : requests.length === 0 ? (
          <Empty
            title={status ? 'Không có yêu cầu khớp bộ lọc' : 'Chưa có yêu cầu nào'}
            hint={
              !status && scope === 'mine'
                ? 'Mở trang Tài sản và chọn một tài sản để gửi đề xuất.'
                : undefined
            }
          />
        ) : (
          <>
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
                  {requests.map((r) => (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>
                        <div className="cell-title">
                          <Link to={`/requests/${r.id}`}>{r.assetName}</Link>
                        </div>
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

            <Pagination
              page={page}
              totalPages={result?.totalPages ?? 0}
              totalElements={total}
              onChange={setPage}
              unit="yêu cầu"
            />
          </>
        )}
      </Panel>
    </>
  );
}

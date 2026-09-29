import { useEffect, useState } from 'react';
import { assetHistoryApi } from '../api/endpoints';
import {
  Alert,
  Empty,
  Loading,
  Pagination,
  Panel,
  formatDateTime,
  useDebouncedValue,
} from '../components/ui';

const PAGE_SIZE = 20;

export default function AssetHistories() {
  const [result, setResult] = useState(null);
  const [openCount, setOpenCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [openOnly, setOpenOnly] = useState(false);
  const [page, setPage] = useState(0);

  // Chi goi API sau khi nguoi dung ngung go, tranh 1 request cho moi phim bam.
  const keyword = useDebouncedValue(q.trim());

  useEffect(() => {
    let alive = true;
    setLoading(true);
    assetHistoryApi
      .list({ q: keyword, openOnly, page, size: PAGE_SIZE })
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
  }, [keyword, openOnly, page]);

  // Tong so luot muon chua tra (khong phu thuoc bo loc dang chon) - chi can dem, size=1.
  useEffect(() => {
    assetHistoryApi
      .list({ openOnly: true, page: 0, size: 1 })
      .then((res) => setOpenCount(res.totalElements))
      .catch(() => setOpenCount(null));
  }, []);

  const histories = result?.content ?? [];
  const total = result?.totalElements ?? 0;
  const filtering = Boolean(keyword) || openOnly;

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={`Lịch sử cấp phát (${total})`}
        description={
          openCount == null
            ? undefined
            : openCount > 0
              ? `Đang có ${openCount} lượt mượn chưa trả.`
              : 'Tất cả lượt mượn đều đã được trả.'
        }
        bodyless
      >
        <div className="panel-body" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="filters">
            <input
              placeholder="Tìm theo tài sản hoặc người mượn…"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(0);
              }}
              style={{ minWidth: 240 }}
            />
            <button
              className={`btn btn-sm ${openOnly ? 'btn-primary' : ''}`}
              onClick={() => {
                setOpenOnly((v) => !v);
                setPage(0);
              }}
            >
              Chỉ lượt chưa trả
            </button>
          </div>
        </div>

        {loading && !result ? (
          <Loading />
        ) : histories.length === 0 ? (
          <Empty
            title={filtering ? 'Không có lượt mượn khớp bộ lọc' : 'Chưa có lượt mượn nào'}
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tài sản</th>
                    <th className="num">SL</th>
                    <th>Người mượn</th>
                    <th>Nhận lúc</th>
                    <th>Trả lúc</th>
                    <th>Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {histories.map((h) => (
                    <tr key={h.id}>
                      <td>
                        <div className="cell-title">{h.assetName}</div>
                        <div className="cell-sub mono">{h.assetCode}</div>
                      </td>
                      <td className="num">{h.quantity ?? '—'}</td>
                      <td>
                        <div className="cell-title">{h.userName}</div>
                        <div className="cell-sub">{h.userEmail}</div>
                      </td>
                      <td>{formatDateTime(h.assignedAt)}</td>
                      <td>{h.returnedAt ? formatDateTime(h.returnedAt) : '—'}</td>
                      <td>
                        {h.returnedAt ? (
                          <span className="badge badge-returned">Đã trả</span>
                        ) : (
                          <span className="badge badge-assigned">Đang giữ</span>
                        )}
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
              unit="lượt mượn"
            />
          </>
        )}
      </Panel>
    </>
  );
}

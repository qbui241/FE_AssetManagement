import { useEffect, useMemo, useState } from 'react';
import { assetHistoryApi } from '../api/endpoints';
import { Alert, Empty, Loading, Panel, formatDateTime } from '../components/ui';

export default function AssetHistories() {
  const [histories, setHistories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [openOnly, setOpenOnly] = useState(false);

  useEffect(() => {
    assetHistoryApi
      .list()
      .then((res) => {
        setHistories(
          [...(res ?? [])].sort((a, b) => new Date(b.assignedAt) - new Date(a.assignedAt))
        );
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return histories.filter((h) => {
      if (openOnly && h.returnedAt) return false;
      if (!needle) return true;
      return [h.assetName, h.assetCode, h.userName, h.userEmail]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [histories, q, openOnly]);

  const outstanding = histories.filter((h) => !h.returnedAt).length;

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={`Lịch sử cấp phát (${filtered.length})`}
        description={
          outstanding > 0
            ? `Đang có ${outstanding} lượt mượn chưa trả.`
            : 'Tất cả lượt mượn đều đã được trả.'
        }
        bodyless
      >
        <div className="panel-body" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="filters">
            <input
              placeholder="Tìm theo tài sản hoặc người mượn…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <button
              className={`btn btn-sm ${openOnly ? 'btn-primary' : ''}`}
              onClick={() => setOpenOnly((v) => !v)}
            >
              Chỉ lượt chưa trả
            </button>
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : filtered.length === 0 ? (
          <Empty
            title={histories.length ? 'Không có lượt mượn khớp bộ lọc' : 'Chưa có lượt mượn nào'}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tài sản</th>
                  <th>Người mượn</th>
                  <th>Nhận lúc</th>
                  <th>Trả lúc</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <div className="cell-title">{h.assetName}</div>
                      <div className="cell-sub mono">{h.assetCode}</div>
                    </td>
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
        )}
      </Panel>
    </>
  );
}

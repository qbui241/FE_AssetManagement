import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { approvalTaskApi } from '../api/endpoints';
import { Alert, Empty, Loading, Pagination, Panel, formatDateTime } from '../components/ui';

const PAGE_SIZE = 20;

export default function Tasks() {
  const [result, setResult] = useState(null);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    return approvalTaskApi
      .mine({ page, size: PAGE_SIZE })
      .then((res) => {
        // Duyet xong task cuoi cua trang cuoi thi trang do het du lieu -> lui 1 trang.
        if (res.content.length === 0 && res.page > 0) {
          setPage(res.page - 1);
          return;
        }
        setResult(res);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (taskId, approve) => {
    setBusyId(taskId);
    setError('');
    setNotice('');
    try {
      if (approve) await approvalTaskApi.approve(taskId);
      else await approvalTaskApi.reject(taskId);
      setNotice(approve ? 'Đã duyệt.' : 'Đã từ chối yêu cầu.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const tasks = result?.content ?? [];
  const total = result?.totalElements ?? 0;

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>
      <Alert kind="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>

      <Panel title={`Chờ tôi duyệt (${total})`} bodyless>
        {loading && !result ? (
          <Loading />
        ) : tasks.length === 0 ? (
          <Empty
            title="Không có việc nào chờ bạn"
            hint="Khi có yêu cầu thuộc phạm vi của bạn, nó sẽ xuất hiện ở đây."
          />
        ) : (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Yêu cầu</th>
                    <th>Tài sản</th>
                    <th>Người yêu cầu</th>
                    <th>Bước</th>
                    <th>Vai trò</th>
                    <th>Ngày gửi</th>
                    <th style={{ textAlign: 'right' }}>Quyết định</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t.id}>
                      <td>#{t.approvalRequestId}</td>
                      <td>
                        <div className="cell-title">
                          <Link to={`/requests/${t.approvalRequestId}`}>{t.assetName}</Link>
                        </div>
                        <div className="cell-sub mono">{t.assetCode}</div>
                      </td>
                      <td>{t.requesterName}</td>
                      <td>Bước {t.stepOrder}</td>
                      <td>
                        <span className="badge badge-role">{t.roleName}</span>
                      </td>
                      <td>{formatDateTime(t.requestCreatedAt)}</td>
                      <td>
                        <div className="btn-row" style={{ justifyContent: 'flex-end' }}>
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={busyId === t.id}
                            onClick={() => decide(t.id, true)}
                          >
                            Duyệt
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            disabled={busyId === t.id}
                            onClick={() => {
                              if (confirm(`Từ chối yêu cầu #${t.approvalRequestId}?`)) {
                                decide(t.id, false);
                              }
                            }}
                          >
                            Từ chối
                          </button>
                        </div>
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
              unit="việc"
            />
          </>
        )}
      </Panel>
    </>
  );
}

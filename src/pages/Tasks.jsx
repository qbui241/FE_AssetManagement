import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { approvalRequestApi, approvalTaskApi } from '../api/endpoints';
import {
  Alert,
  Empty,
  Loading,
  Panel,
  RequestStatusBadge,
  formatDateTime,
} from '../components/ui';

export default function Tasks() {
  const [tasks, setTasks] = useState([]);
  const [requests, setRequests] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    approvalTaskApi
      .list({ status: 'PENDING' })
      .then(async (list) => {
        setTasks(list ?? []);
        setError('');
        // Lay them thong tin tai san cua tung yeu cau de bang de doc hon.
        const ids = [...new Set((list ?? []).map((t) => t.approvalRequestId))];
        const entries = await Promise.all(
          ids.map((id) =>
            approvalRequestApi
              .get(id)
              .then((r) => [id, r])
              .catch(() => [id, null])
          )
        );
        setRequests(Object.fromEntries(entries));
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(load, [load]);

  const decide = async (taskId, approve) => {
    setBusyId(taskId);
    setError('');
    setNotice('');
    try {
      if (approve) await approvalTaskApi.approve(taskId);
      else await approvalTaskApi.reject(taskId);
      setNotice(approve ? 'Đã duyệt.' : 'Đã từ chối yêu cầu.');
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

      <Panel title={`Chờ tôi duyệt (${tasks.length})`} bodyless>
        {loading ? (
          <Loading />
        ) : tasks.length === 0 ? (
          <Empty
            title="Không có việc nào chờ bạn"
            hint="Khi có yêu cầu thuộc phạm vi của bạn, nó sẽ xuất hiện ở đây."
          />
        ) : (
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
                {tasks.map((t) => {
                  const r = requests[t.approvalRequestId];
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link to={`/requests/${t.approvalRequestId}`}>#{t.approvalRequestId}</Link>
                      </td>
                      <td>
                        {r ? (
                          <>
                            <div className="cell-title">{r.assetName}</div>
                            <div className="cell-sub mono">{r.assetCode}</div>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{r?.requesterName ?? '—'}</td>
                      <td>Bước {t.stepOrder}</td>
                      <td>
                        <span className="badge badge-role">{t.roleName}</span>
                      </td>
                      <td>{formatDateTime(r?.createdAt)}</td>
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}

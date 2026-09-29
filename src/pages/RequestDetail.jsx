import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { approvalRequestApi, approvalTaskApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  Alert,
  Loading,
  Panel,
  RequestStatusBadge,
  formatDateTime,
  requestStatusLabel,
} from '../components/ui';

const DOT = { APPROVED: '✓', REJECTED: '✕', PENDING: '•', CANCELLED: '–' };

export default function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [request, setRequest] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    // Moi task da kem co canDecide do backend tinh (dung vai tro, dung pham vi,
    // khong phai nguoi yeu cau, dung buoc hien tai) nen khong can tu suy doan o day.
    Promise.all([approvalRequestApi.get(id), approvalRequestApi.tasksOf(id).catch(() => [])])
      .then(([req, taskList]) => {
        setRequest(req);
        setTasks(taskList ?? []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  const decide = async (taskId, approve) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (approve) await approvalTaskApi.approve(taskId);
      else await approvalTaskApi.reject(taskId);
      setNotice(approve ? 'Đã duyệt bước này.' : 'Đã từ chối yêu cầu.');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loading />;
  if (!request) return <Alert kind="error">{error || 'Không tìm thấy yêu cầu.'}</Alert>;

  const isMine = request.requesterId === user?.id;

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>
      <Alert kind="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>

      <Panel
        title={`Yêu cầu #${request.id}`}
        description={`${request.workflowName} · ${requestStatusLabel(request.status)}`}
        actions={
          <button className="btn btn-sm" onClick={() => navigate(-1)}>
            Quay lại
          </button>
        }
      >
        <div className="detail-grid">
          <Item k="Trạng thái" v={<RequestStatusBadge status={request.status} />} />
          <Item
            k="Tài sản"
            v={
              <Link to={`/assets/${request.assetId}`}>
                {request.assetName} <span className="mono">({request.assetCode})</span>
              </Link>
            }
          />
          <Item k="Người yêu cầu" v={`${request.requesterName}${isMine ? ' (bạn)' : ''}`} />
          {request.requestedQuantity != null && (
            <Item k="Số lượng đề xuất" v={request.requestedQuantity} />
          )}
          <Item k="Bước hiện tại" v={`Bước ${request.currentStepOrder}`} />
          <Item k="Ngày gửi" v={formatDateTime(request.createdAt)} />
          <Item k="Hoàn tất lúc" v={formatDateTime(request.completedAt)} />
        </div>
      </Panel>

      <Panel
        title="Tiến trình phê duyệt"
        description={
          tasks.length
            ? 'Các bước cùng số thứ tự là duyệt song song — chỉ cần một bên từ chối là yêu cầu dừng lại.'
            : undefined
        }
      >
        {tasks.length === 0 ? (
          <p style={{ color: 'var(--ink-faint)', margin: 0 }}>Chưa có bước duyệt nào được tạo.</p>
        ) : (
          <ul className="timeline">
            {tasks.map((t) => {
              const canDecide = t.status === 'PENDING' && t.canDecide === true;
              return (
                <li key={t.id}>
                  <span className={`dot ${t.status.toLowerCase()}`}>{DOT[t.status] ?? '•'}</span>
                  <div className="body">
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="who">Bước {t.stepOrder}</span>
                      <span className="badge badge-role">{t.roleName}</span>
                      <RequestStatusBadge status={t.status} />
                    </div>
                    <div className="when">
                      {t.approvedByName
                        ? `${t.approvedByName} · ${formatDateTime(t.approvedAt)}`
                        : t.status === 'PENDING'
                          ? 'Đang chờ quyết định'
                          : formatDateTime(t.approvedAt)}
                    </div>
                    {t.note && <div className="note">{t.note}</div>}
                    {canDecide && (
                      <div className="btn-row" style={{ marginTop: 8 }}>
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={busy}
                          onClick={() => decide(t.id, true)}
                        >
                          Duyệt
                        </button>
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busy}
                          onClick={() => {
                            if (confirm('Từ chối yêu cầu này?')) decide(t.id, false);
                          }}
                        >
                          Từ chối
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
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

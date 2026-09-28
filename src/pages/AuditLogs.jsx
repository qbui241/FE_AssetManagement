import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { auditLogApi } from '../api/endpoints';
import { Alert, Empty, Loading, Panel, formatDateTime } from '../components/ui';

const ACTION_LABEL = {
  STATUS_CHANGED: 'Đổi trạng thái',
  APPROVED: 'Duyệt',
  REJECTED: 'Từ chối',
  ESCALATED: 'Chuyển cấp',
  QUANTITY_ASSIGNED: 'Cấp phát số lượng',
  QUANTITY_RETURNED: 'Trả số lượng',
  QUANTITY_DISPOSED: 'Thanh lý số lượng',
};

const ACTION_BADGE = {
  APPROVED: 'badge-approved',
  REJECTED: 'badge-rejected',
  ESCALATED: 'badge-pending',
  STATUS_CHANGED: 'badge-assigned',
};

function linkFor(log) {
  if (log.entityType === 'ASSET') return `/assets/${log.entityId}`;
  if (log.entityType === 'APPROVAL_REQUEST') return `/requests/${log.entityId}`;
  return null;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [q, setQ] = useState('');

  useEffect(() => {
    auditLogApi
      .list()
      .then((res) => {
        // Moi nhat len dau, vi backend tra ve theo thu tu chen.
        setLogs([...(res ?? [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const actions = useMemo(() => [...new Set(logs.map((l) => l.action))].sort(), [logs]);
  const entityTypes = useMemo(() => [...new Set(logs.map((l) => l.entityType))].sort(), [logs]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (action && l.action !== action) return false;
      if (entityType && l.entityType !== entityType) return false;
      if (!needle) return true;
      return [l.description, l.performedByName, l.entityType]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [logs, action, entityType, q]);

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={`Nhật ký hệ thống (${filtered.length})`}
        description="Mọi thay đổi trạng thái tài sản và quyết định duyệt đều được ghi lại."
        bodyless
      >
        <div className="panel-body" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="filters">
            <input
              placeholder="Tìm trong mô tả, người thực hiện…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 240 }}
            />
            <select value={action} onChange={(e) => setAction(e.target.value)}>
              <option value="">Mọi hành động</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {ACTION_LABEL[a] ?? a}
                </option>
              ))}
            </select>
            <select value={entityType} onChange={(e) => setEntityType(e.target.value)}>
              <option value="">Mọi đối tượng</option>
              {entityTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {(q || action || entityType) && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setQ('');
                  setAction('');
                  setEntityType('');
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
          <Empty title={logs.length ? 'Không có bản ghi khớp bộ lọc' : 'Chưa có bản ghi nào'} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Thời điểm</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Thay đổi</th>
                  <th>Mô tả</th>
                  <th>Người thực hiện</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((l) => {
                  const href = linkFor(l);
                  return (
                    <tr key={l.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{formatDateTime(l.createdAt)}</td>
                      <td>
                        <span className={`badge ${ACTION_BADGE[l.action] ?? 'badge-role'}`}>
                          {ACTION_LABEL[l.action] ?? l.action}
                        </span>
                      </td>
                      <td>
                        {href ? (
                          <Link to={href}>
                            {l.entityType} #{l.entityId}
                          </Link>
                        ) : (
                          <span className="cell-sub">
                            {l.entityType} #{l.entityId}
                          </span>
                        )}
                      </td>
                      <td className="cell-sub">
                        {l.oldValue || l.newValue ? (
                          <>
                            {l.oldValue ?? '—'} → <strong>{l.newValue ?? '—'}</strong>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td>{l.description || '—'}</td>
                      <td>
                        {l.performedByName || (
                          <span className="cell-sub">Hệ thống</span>
                        )}
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

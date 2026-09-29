import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { auditLogApi } from '../api/endpoints';
import { Alert, Empty, Loading, Pagination, Panel, formatDateTime } from '../components/ui';

const ACTION_OPTIONS = [
  ['STATUS_CHANGED', 'Đổi trạng thái'],
  ['APPROVED', 'Duyệt'],
  ['REJECTED', 'Từ chối'],
  ['ESCALATED', 'Chuyển cấp'],
  ['QUANTITY_ASSIGNED', 'Cấp phát số lượng'],
  ['QUANTITY_RETURNED', 'Trả số lượng'],
  ['QUANTITY_DISPOSED', 'Thanh lý số lượng'],
];
const ACTION_LABEL = Object.fromEntries(ACTION_OPTIONS);

const ENTITY_OPTIONS = ['ASSET', 'APPROVAL_REQUEST', 'APPROVAL_TASK'];

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

const PAGE_SIZE = 20;

export default function AuditLogs() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [action, setAction] = useState('');
  const [entityType, setEntityType] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(0);

  const hasFilters = action || entityType || from || to;

  const load = () => {
    setLoading(true);
    auditLogApi
      .list({ action, entityType, from: from || undefined, to: to || undefined, page, size: PAGE_SIZE })
      .then((res) => {
        setResult(res);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, [action, entityType, from, to, page]);

  // Moi setter reset ve trang 0 trong cung 1 lan cap nhat (React batch trong
  // event handler), tranh goi API 2 lan khi doi filter nhu tach rieng 1 effect.
  const updateFilter = (setter) => (value) => {
    setter(value);
    setPage(0);
  };

  const logs = result?.content ?? [];
  const totalPages = result?.totalPages ?? 0;
  const totalElements = result?.totalElements ?? 0;

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={`Nhật ký hệ thống (${totalElements})`}
        description="Mọi thay đổi trạng thái tài sản và quyết định duyệt đều được ghi lại."
        bodyless
      >
        <div className="panel-body" style={{ borderBottom: '1px solid var(--line)' }}>
          <div className="filters">
            <select value={action} onChange={(e) => updateFilter(setAction)(e.target.value)}>
              <option value="">Mọi hành động</option>
              {ACTION_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select value={entityType} onChange={(e) => updateFilter(setEntityType)(e.target.value)}>
              <option value="">Mọi đối tượng</option>
              {ENTITY_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              value={from}
              onChange={(e) => updateFilter(setFrom)(e.target.value)}
              title="Từ ngày"
            />
            <input
              type="datetime-local"
              value={to}
              onChange={(e) => updateFilter(setTo)(e.target.value)}
              title="Đến ngày"
            />
            {hasFilters && (
              <button
                className="btn btn-sm"
                onClick={() => {
                  setAction('');
                  setEntityType('');
                  setFrom('');
                  setTo('');
                  setPage(0);
                }}
              >
                Xoá bộ lọc
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : logs.length === 0 ? (
          <Empty title={hasFilters ? 'Không có bản ghi khớp bộ lọc' : 'Chưa có bản ghi nào'} />
        ) : (
          <>
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
                  {logs.map((l) => {
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
                        <td>{l.performedByName || <span className="cell-sub">Hệ thống</span>}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination
              page={page}
              totalPages={totalPages}
              totalElements={totalElements}
              onChange={setPage}
            />
          </>
        )}
      </Panel>
    </>
  );
}

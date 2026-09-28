import { useEffect } from 'react';

/* ---------- Dinh dang ---------- */

export function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '—';
  return new Intl.NumberFormat('vi-VN').format(Number(value)) + ' ₫';
}

export function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('vi-VN');
}

export function formatDateTime(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---------- Nhan trang thai ---------- */

const ASSET_STATUS_LABEL = {
  AVAILABLE: 'Sẵn sàng',
  ASSIGNED: 'Đang cấp phát',
  MAINTENANCE: 'Bảo trì',
  RETURNED: 'Đã thu hồi',
  DISPOSED: 'Đã thanh lý',
};

const REQUEST_STATUS_LABEL = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  CANCELLED: 'Đã huỷ',
};

export function AssetStatusBadge({ status }) {
  return (
    <span className={`badge badge-${String(status).toLowerCase()}`}>
      {ASSET_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function RequestStatusBadge({ status }) {
  return (
    <span className={`badge badge-${String(status).toLowerCase()}`}>
      {REQUEST_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function TrackingBadge({ type }) {
  return (
    <span className={`badge badge-${type === 'BULK' ? 'bulk' : 'individual'}`}>
      {type === 'BULK' ? 'Theo số lượng' : 'Theo serial'}
    </span>
  );
}

export const assetStatusLabel = (s) => ASSET_STATUS_LABEL[s] ?? s;
export const requestStatusLabel = (s) => REQUEST_STATUS_LABEL[s] ?? s;

/* ---------- Trang thai chung ---------- */

export function Loading({ text = 'Đang tải…' }) {
  return <div className="loading">{text}</div>;
}

export function Empty({ title, hint }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      {hint && <span>{hint}</span>}
    </div>
  );
}

export function Alert({ kind = 'error', children, onDismiss }) {
  if (!children) return null;
  return (
    <div className={`alert alert-${kind}`} role={kind === 'error' ? 'alert' : 'status'}>
      {children}
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          style={{
            float: 'right',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'inherit',
            fontWeight: 600,
          }}
          aria-label="Đóng thông báo"
        >
          ×
        </button>
      )}
    </div>
  );
}

export function Panel({ title, description, actions, children, bodyless = false }) {
  return (
    <section className="panel">
      {(title || actions) && (
        <header className="panel-head">
          <div>
            {title && <h2>{title}</h2>}
            {description && <p style={{ margin: '2px 0 0', color: 'var(--ink-soft)' }}>{description}</p>}
          </div>
          {actions && <div className="btn-row">{actions}</div>}
        </header>
      )}
      {bodyless ? children : <div className="panel-body">{children}</div>}
    </section>
  );
}

/* ---------- Modal ---------- */

export function Modal({ title, children, onClose, footer, wide = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" style={wide ? { maxWidth: 760 } : undefined}>
        <header className="modal-head">
          <h2>{title}</h2>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-foot">{footer}</footer>}
      </div>
    </div>
  );
}

/* ---------- Field ---------- */

export function Field({ label, required, hint, children }) {
  return (
    <div className="field">
      <label>
        {label} {required && <span className="req">*</span>}
      </label>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </div>
  );
}

/* ---------- Helper cho du lieu tra ve dang entity tho ---------- */

/**
 * DepartmentController tra ve entity Department (khong phai DTO), nen ten chi
 * nhanh nam trong object long nhau `branch.name` chu khong phai `branchName`.
 * Ham nay chap nhan ca 2 dang de khong vo neu backend doi sang DTO sau nay.
 */
export function branchNameOf(dept) {
  return dept?.branch?.name ?? dept?.branchName ?? null;
}

export function deptLabel(dept) {
  if (!dept) return '—';
  const branch = branchNameOf(dept);
  return branch ? `${dept.name} — ${branch}` : dept.name;
}

export function branchIdOf(dept) {
  return dept?.branch?.id ?? dept?.branchId ?? null;
}

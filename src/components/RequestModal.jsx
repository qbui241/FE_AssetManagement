import { useState } from 'react';
import { approvalRequestApi } from '../api/endpoints';
import { Alert, Field, Modal, formatMoney } from './ui';

/**
 * Gui yeu cau cap phat/thanh ly cho 1 asset. Dung chung o trang danh sach
 * Tai san (thao tac nhanh tren dong) va trang chi tiet Tai san.
 */
export default function RequestModal({ asset, onClose, onCreated }) {
  const isBulk = asset.trackingType === 'BULK';
  const [actionType, setActionType] = useState('ASSIGNMENT');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const created = await approvalRequestApi.create({
        assetId: asset.id,
        actionType,
        requestedQuantity: isBulk ? Number(quantity) : null,
      });
      onCreated(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const total = isBulk ? Number(asset.value) * Number(quantity || 0) : Number(asset.value);

  return (
    <Modal
      title={`Gửi yêu cầu cho ${asset.assetCode}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="req-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang gửi…' : 'Gửi yêu cầu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>

      <p style={{ marginTop: 0, color: 'var(--ink-soft)' }}>
        {asset.name} · <span className="mono">{asset.assetCode}</span>
      </p>

      <form id="req-form" onSubmit={submit}>
        <Field label="Loại yêu cầu" required>
          <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
            <option value="ASSIGNMENT">Cấp phát / mượn</option>
            <option value="DISPOSAL">Thanh lý</option>
          </select>
        </Field>

        {isBulk && (
          <Field
            label="Số lượng đề xuất"
            required
            hint={`Còn lại ${asset.availableQuantity} đơn vị.`}
          >
            <input
              type="number"
              min="1"
              max={asset.availableQuantity}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
            />
          </Field>
        )}

        <div className="alert alert-info" style={{ marginBottom: 0 }}>
          Tổng giá trị đề xuất: <strong>{formatMoney(total)}</strong>. Số bước duyệt phụ thuộc giá
          trị này và cấu hình quy trình.
        </div>
      </form>
    </Modal>
  );
}

import { useEffect, useState } from 'react';
import { approvalRequestApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import {
  ACTION_TYPE_LABEL,
  Alert,
  Field,
  Modal,
  allowedRequestActionTypes,
  allowedRequestActionTypesFor,
  formatMoney,
} from './ui';

/**
 * Gui yeu cau cap phat/thanh ly cho 1 asset. Dung chung o trang danh sach
 * Tai san (thao tac nhanh tren dong) va trang chi tiet Tai san.
 */
export default function RequestModal({ asset, onClose, onCreated }) {
  const { user, hasRole } = useAuth();
  const isBulk = asset.trackingType === 'BULK';

  // 2 tang dieu kien cho dropdown "Loai yeu cau":
  //   - statusOptions: hop le theo TRANG THAI asset (validateAssetStatusForAction
  //     o BE - vd DISPOSAL chi hop le tu RETURNED).
  //   - options: giao them voi ROLE + PHAM VI nguoi gui cho DISPOSAL
  //     (validateDisposalRequest o BE - xem canRequestDisposal trong ui.jsx:
  //     ADMIN khong gioi han, DIRECTOR theo chi nhanh, MANAGER theo phong ban,
  //     role khac thi khong duoc gui thanh ly).
  // Modal nay chi mo duoc khi canRequestAsset()/canRequest da true (Assets.jsx,
  // AssetDetail.jsx deu check truoc khi hien nut Gui dua tren statusOptions),
  // nhung ASSIGNMENT luon duoc giu lai nen options co the rong neu asset chi
  // con DISPOSAL hop le ma nguoi gui lai khong co quyen - truong hop nay nut
  // Gui o 2 trang kia da duoc an/disable truoc (xem allowedRequestActionTypesFor).
  const statusOptions = allowedRequestActionTypes(asset);
  const options = allowedRequestActionTypesFor(asset, user, hasRole);
  // Phan biet ly do khien dropdown chi con 1 (hoac 0) lua chon: do ROLE/PHAM VI
  // (DISPOSAL hop le theo trang thai nhung nguoi gui khong co quyen) hay chi
  // don gian do TRANG THAI asset (vd dang AVAILABLE thi chi co ASSIGNMENT,
  // khong lien quan gi den quyen han).
  const hiddenByScope = statusOptions.includes('DISPOSAL') && !options.includes('DISPOSAL');

  const [actionType, setActionType] = useState(options[0] ?? 'ASSIGNMENT');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Neu actionType dang chon roi khoi danh sach hop le (doi dieu kien phong
  // ban, hoac asset vua doi trang thai trong luc modal mo), nhay ve lua chon
  // dau tien con hop le thay vi giu nguyen 1 gia tri khong con trong dropdown.
  useEffect(() => {
    if (options.length > 0 && !options.includes(actionType)) {
      setActionType(options[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.join(','), actionType]);

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
          <button
            type="submit"
            form="req-form"
            className="btn btn-primary"
            disabled={busy || options.length === 0}
          >
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
        <Field
          label="Loại yêu cầu"
          required
          hint={
            hiddenByScope
              ? hasRole('MANAGER') && !hasRole('DIRECTOR', 'ADMIN')
                ? 'Tài sản thuộc phòng ban khác nên bạn chỉ có thể đề xuất mượn, không thể đề xuất thanh lý.'
                : hasRole('DIRECTOR') && !hasRole('ADMIN')
                  ? 'Tài sản thuộc chi nhánh khác nên bạn chỉ có thể đề xuất mượn, không thể đề xuất thanh lý.'
                  : 'Bạn không có quyền đề xuất thanh lý tài sản này.'
              : options.length < 2
                ? 'Loại yêu cầu được giới hạn theo trạng thái hiện tại của tài sản.'
                : undefined
          }
        >
          {options.length > 0 ? (
            <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
              {options.map((t) => (
                <option key={t} value={t}>
                  {ACTION_TYPE_LABEL[t]}
                </option>
              ))}
            </select>
          ) : (
            <div className="alert alert-error" style={{ marginBottom: 0 }}>
              Bạn không có quyền gửi yêu cầu nào cho tài sản này ở trạng thái hiện tại.
            </div>
          )}
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
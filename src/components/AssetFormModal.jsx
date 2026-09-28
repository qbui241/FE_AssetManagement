import { useEffect, useState } from 'react';
import { assetApi, attributeApi } from '../api/endpoints';
import { Alert, Field, Modal, deptLabel } from './ui';

const EMPTY = {
  assetCode: '',
  name: '',
  serialNumber: '',
  trackingType: 'INDIVIDUAL',
  quantity: '',
  value: '',
  purchaseDate: new Date().toISOString().slice(0, 10),
  categoryId: '',
  departmentId: '',
};

/**
 * Form tao/sua tai san. Phan thuoc tinh duoi cung duoc sinh dong theo
 * AttributeDefinition cua danh muc dang chon (co che EAV cua backend).
 */
export default function AssetFormModal({ asset, categories, departments, onClose, onSaved }) {
  const editing = Boolean(asset);
  const [form, setForm] = useState(() =>
    asset
      ? {
          assetCode: asset.assetCode ?? '',
          name: asset.name ?? '',
          serialNumber: asset.serialNumber ?? '',
          trackingType: asset.trackingType ?? 'INDIVIDUAL',
          quantity: asset.quantity ?? '',
          value: asset.value ?? '',
          purchaseDate: asset.purchaseDate ?? '',
          categoryId: String(asset.categoryId ?? ''),
          departmentId: String(asset.departmentId ?? ''),
        }
      : EMPTY
  );
  const [defs, setDefs] = useState([]);
  const [attrValues, setAttrValues] = useState(() => {
    const seed = {};
    (asset?.attributes ?? []).forEach((a) => {
      seed[a.attributeDefinitionId] = a.value ?? '';
    });
    return seed;
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Nap dinh nghia thuoc tinh moi khi doi danh muc.
  useEffect(() => {
    if (!form.categoryId) {
      setDefs([]);
      return;
    }
    attributeApi
      .byCategory(form.categoryId)
      .then((res) => setDefs(res ?? []))
      .catch(() => setDefs([]));
  }, [form.categoryId]);

  const isBulk = form.trackingType === 'BULK';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);

    const payload = {
      assetCode: form.assetCode.trim(),
      name: form.name.trim(),
      // Backend co unique constraint tren serial_number, nen chuoi rong phai
      // gui la null de nhieu asset BULK khong dung do nhau.
      serialNumber: isBulk || !form.serialNumber.trim() ? null : form.serialNumber.trim(),
      trackingType: form.trackingType,
      quantity: isBulk ? Number(form.quantity) : null,
      value: Number(form.value),
      purchaseDate: form.purchaseDate,
      categoryId: Number(form.categoryId),
      departmentId: Number(form.departmentId),
      attributes: defs
        .map((d) => ({
          attributeDefinitionId: d.id,
          value: (attrValues[d.id] ?? '').trim(),
        }))
        .filter((a) => a.value !== ''),
    };

    try {
      if (editing) await assetApi.update(asset.id, payload);
      else await assetApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa tài sản ${asset.assetCode}` : 'Thêm tài sản'}
      onClose={onClose}
      wide
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="asset-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : editing ? 'Lưu thay đổi' : 'Thêm tài sản'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>

      <form id="asset-form" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Mã tài sản" required>
            <input
              value={form.assetCode}
              onChange={(e) => setForm({ ...form, assetCode: e.target.value })}
              placeholder="LAP-004"
              required
            />
          </Field>
          <Field label="Tên tài sản" required>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </Field>

          <Field
            label="Cách quản lý"
            required
            hint={
              isBulk
                ? 'Trừ dần theo số lượng, không cần serial.'
                : 'Mỗi tài sản là một đơn vị riêng, theo dõi bằng serial.'
            }
          >
            <select
              value={form.trackingType}
              onChange={(e) => setForm({ ...form, trackingType: e.target.value })}
              disabled={editing}
            >
              <option value="INDIVIDUAL">Theo serial</option>
              <option value="BULK">Theo số lượng</option>
            </select>
          </Field>

          {isBulk ? (
            <Field label="Số lượng" required>
              <input
                type="number"
                min="1"
                value={form.quantity}
                onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                required
              />
            </Field>
          ) : (
            <Field label="Số serial">
              <input
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                placeholder="Để trống nếu chưa có"
              />
            </Field>
          )}

          <Field
            label={isBulk ? 'Đơn giá' : 'Giá trị'}
            required
            hint={isBulk ? 'Ngưỡng duyệt tính theo đơn giá × số lượng đề xuất.' : undefined}
          >
            <input
              type="number"
              min="1"
              step="1000"
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
              required
            />
          </Field>
          <Field label="Ngày mua" required>
            <input
              type="date"
              value={form.purchaseDate}
              onChange={(e) => setForm({ ...form, purchaseDate: e.target.value })}
              required
            />
          </Field>

          <Field label="Danh mục" required>
            <select
              value={form.categoryId}
              onChange={(e) => {
                setForm({ ...form, categoryId: e.target.value });
                setAttrValues({});
              }}
              required
            >
              <option value="">Chọn danh mục</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Phòng ban quản lý" required>
            <select
              value={form.departmentId}
              onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
              required
            >
              <option value="">Chọn phòng ban</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {deptLabel(d)}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {defs.length > 0 && (
          <>
            <h3 style={{ margin: '10px 0 12px', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
              Thông số kỹ thuật
            </h3>
            <div className="form-grid">
              {defs.map((d) => (
                <Field key={d.id} label={d.label} required={d.required}>
                  {d.dataType === 'BOOLEAN' ? (
                    <select
                      value={attrValues[d.id] ?? ''}
                      onChange={(e) => setAttrValues({ ...attrValues, [d.id]: e.target.value })}
                      required={d.required}
                    >
                      <option value="">Chọn</option>
                      <option value="true">Có</option>
                      <option value="false">Không</option>
                    </select>
                  ) : (
                    <input
                      type={
                        d.dataType === 'NUMBER' ? 'number' : d.dataType === 'DATE' ? 'date' : 'text'
                      }
                      value={attrValues[d.id] ?? ''}
                      onChange={(e) => setAttrValues({ ...attrValues, [d.id]: e.target.value })}
                      required={d.required}
                    />
                  )}
                </Field>
              ))}
            </div>
          </>
        )}
      </form>
    </Modal>
  );
}

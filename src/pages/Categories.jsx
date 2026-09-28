import { useEffect, useMemo, useState } from 'react';
import { attributeApi, categoryApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Alert, Empty, Field, Loading, Modal, Panel } from '../components/ui';
import { IconPencil, IconTrash } from '../components/icons';

const DATA_TYPES = [
  ['STRING', 'Chuỗi'],
  ['NUMBER', 'Số'],
  ['DATE', 'Ngày'],
  ['BOOLEAN', 'Có / Không'],
];

const TYPE_LABEL = Object.fromEntries(DATA_TYPES);

export default function Categories() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');
  const canDeleteCategory = hasRole('DIRECTOR');

  const [categories, setCategories] = useState([]);
  const [attributes, setAttributes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const [catForm, setCatForm] = useState(null);
  const [attrForm, setAttrForm] = useState(null);

  const load = () => {
    setLoading(true);
    Promise.all([categoryApi.list(), attributeApi.list().catch(() => [])])
      .then(([c, a]) => {
        setCategories(c ?? []);
        setAttributes(a ?? []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const visibleAttributes = useMemo(
    () =>
      selectedCategory
        ? attributes.filter((a) => String(a.categoryId) === selectedCategory)
        : attributes,
    [attributes, selectedCategory]
  );

  const attrCountByCategory = useMemo(() => {
    return attributes.reduce((acc, a) => {
      acc[a.categoryId] = (acc[a.categoryId] ?? 0) + 1;
      return acc;
    }, {});
  }, [attributes]);

  const removeCategory = async (c) => {
    if (!confirm(`Xoá danh mục ${c.name}? Các thuộc tính thuộc danh mục này cũng bị ảnh hưởng.`))
      return;
    try {
      await categoryApi.remove(c.id);
      setNotice(`Đã xoá danh mục ${c.name}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeAttribute = async (a) => {
    if (!confirm(`Xoá thuộc tính "${a.label}"?`)) return;
    try {
      await attributeApi.remove(a.id);
      setNotice(`Đã xoá thuộc tính ${a.label}.`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <>
      <Alert kind="error" onDismiss={() => setError('')}>
        {error}
      </Alert>
      <Alert kind="success" onDismiss={() => setNotice('')}>
        {notice}
      </Alert>

      <div className="two-col">
        <Panel
          title={`Danh mục tài sản (${categories.length})`}
          actions={
            isAdmin && (
              <button className="btn btn-sm btn-primary" onClick={() => setCatForm({})}>
                Thêm
              </button>
            )
          }
          bodyless
        >
          {categories.length === 0 ? (
            <Empty title="Chưa có danh mục nào" />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Mô tả</th>
                    <th className="num">Thuộc tính</th>
                    {(isAdmin || canDeleteCategory) && <th className="actions-col">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {categories.map((c) => (
                    <tr key={c.id}>
                      <td className="cell-title">{c.name}</td>
                      <td>{c.description || '—'}</td>
                      <td className="num">{attrCountByCategory[c.id] ?? 0}</td>
                      {(isAdmin || canDeleteCategory) && (
                        <td className="actions-col">
                          <div className="row-actions">
                            {isAdmin && (
                              <button
                                className="icon-btn"
                                title="Sửa danh mục"
                                onClick={() => setCatForm(c)}
                              >
                                <IconPencil />
                              </button>
                            )}
                            {canDeleteCategory && (
                              <button
                                className="icon-btn danger"
                                title="Xoá danh mục"
                                onClick={() => removeCategory(c)}
                              >
                                <IconTrash />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel
          title={`Thuộc tính động (${visibleAttributes.length})`}
          description="Các trường này sinh ra form nhập thông số khi tạo tài sản."
          actions={
            <>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  padding: '6px 10px',
                  border: '1px solid var(--line-strong)',
                  borderRadius: 'var(--radius)',
                }}
              >
                <option value="">Mọi danh mục</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {isAdmin && (
                <button
                  className="btn btn-sm btn-primary"
                  disabled={categories.length === 0}
                  onClick={() => setAttrForm({})}
                >
                  Thêm
                </button>
              )}
            </>
          }
          bodyless
        >
          {visibleAttributes.length === 0 ? (
            <Empty
              title="Chưa có thuộc tính nào"
              hint="Ví dụ: Laptop cần CPU và RAM, Xe cần biển số."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Nhãn hiển thị</th>
                    <th>Mã trường</th>
                    <th>Danh mục</th>
                    <th>Kiểu</th>
                    <th>Bắt buộc</th>
                    {isAdmin && <th className="actions-col">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {visibleAttributes.map((a) => (
                    <tr key={a.id}>
                      <td className="cell-title">{a.label}</td>
                      <td className="mono">{a.name}</td>
                      <td>{a.categoryName}</td>
                      <td>{TYPE_LABEL[a.dataType] ?? a.dataType}</td>
                      <td>
                        {a.required ? (
                          <span className="badge badge-approved">Bắt buộc</span>
                        ) : (
                          <span className="badge badge-cancelled">Tuỳ chọn</span>
                        )}
                      </td>
                      {isAdmin && (
                        <td className="actions-col">
                          <div className="row-actions">
                            <button
                              className="icon-btn"
                              title="Sửa thuộc tính"
                              onClick={() => setAttrForm(a)}
                            >
                              <IconPencil />
                            </button>
                            <button
                              className="icon-btn danger"
                              title="Xoá thuộc tính"
                              onClick={() => removeAttribute(a)}
                            >
                              <IconTrash />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>

      {catForm && (
        <CategoryModal
          category={catForm.id ? catForm : null}
          onClose={() => setCatForm(null)}
          onSaved={() => {
            setCatForm(null);
            setNotice('Đã lưu danh mục.');
            load();
          }}
        />
      )}

      {attrForm && (
        <AttributeModal
          attribute={attrForm.id ? attrForm : null}
          categories={categories}
          defaultCategoryId={selectedCategory}
          onClose={() => setAttrForm(null)}
          onSaved={() => {
            setAttrForm(null);
            setNotice('Đã lưu thuộc tính.');
            load();
          }}
        />
      )}
    </>
  );
}

function CategoryModal({ category, onClose, onSaved }) {
  const editing = Boolean(category);
  const [form, setForm] = useState({
    name: category?.name ?? '',
    description: category?.description ?? '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = { name: form.name.trim(), description: form.description.trim() };
      if (editing) await categoryApi.update(category.id, payload);
      else await categoryApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa danh mục ${category.name}` : 'Thêm danh mục'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="cat-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>
      <form id="cat-form" onSubmit={submit}>
        <Field label="Tên danh mục" required>
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Laptop, Server, Vehicle…"
            required
          />
        </Field>
        <Field label="Mô tả">
          <input
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>
      </form>
    </Modal>
  );
}

function AttributeModal({ attribute, categories, defaultCategoryId, onClose, onSaved }) {
  const editing = Boolean(attribute);
  const [form, setForm] = useState({
    categoryId: String(attribute?.categoryId ?? defaultCategoryId ?? ''),
    name: attribute?.name ?? '',
    label: attribute?.label ?? '',
    dataType: attribute?.dataType ?? 'STRING',
    required: attribute?.required ?? false,
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload = {
        categoryId: Number(form.categoryId),
        name: form.name.trim(),
        label: form.label.trim(),
        dataType: form.dataType,
        required: form.required,
      };
      if (editing) await attributeApi.update(attribute.id, payload);
      else await attributeApi.create(payload);
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      title={editing ? `Sửa thuộc tính ${attribute.label}` : 'Thêm thuộc tính'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose} disabled={busy}>
            Huỷ
          </button>
          <button type="submit" form="attr-form" className="btn btn-primary" disabled={busy}>
            {busy ? 'Đang lưu…' : 'Lưu'}
          </button>
        </>
      }
    >
      <Alert kind="error">{error}</Alert>
      <form id="attr-form" onSubmit={submit}>
        <Field label="Danh mục" required>
          <select
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
            disabled={editing}
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
        <Field label="Nhãn hiển thị" required hint="Tên người dùng nhìn thấy trên form.">
          <input
            value={form.label}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="RAM (GB)"
            required
          />
        </Field>
        <Field
          label="Mã trường"
          required
          hint="Không dấu, không khoảng trắng. Duy nhất trong cùng danh mục."
        >
          <input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="ram_gb"
            required
          />
        </Field>
        <Field label="Kiểu dữ liệu" required>
          <select
            value={form.dataType}
            onChange={(e) => setForm({ ...form, dataType: e.target.value })}
          >
            {DATA_TYPES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </Field>
        <div className="field">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 400 }}>
            <input
              type="checkbox"
              checked={form.required}
              onChange={(e) => setForm({ ...form, required: e.target.checked })}
              style={{ width: 'auto' }}
            />
            Bắt buộc nhập khi tạo tài sản
          </label>
        </div>
      </form>
    </Modal>
  );
}

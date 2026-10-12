import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { assetHistoryApi, userApi } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Alert, Empty, Field, Loading, Modal, Panel, formatDateTime } from '../components/ui';
import { useToast } from '../components/ToastProvider';

const ROLE_LABEL = {
    MANAGER: 'Trưởng phòng',
    DIRECTOR: 'Giám đốc',
    ADMIN: 'Quản trị hệ thống',
};

function InfoRow({ label, children }) {
    return (
        <div className="profile-row">
            <dt>{label}</dt>
            <dd>{children || '—'}</dd>
        </div>
    );
}

function ChangePasswordModal({ onClose, onSaved }) {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setError('');

        if (newPassword !== confirmPassword) {
            setError('Mật khẩu mới nhắp lại không khớp.');
            return;
        }

        setBusy(true);
        try {
            await userApi.changePassword(currentPassword, newPassword);
            onSaved();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal
            title="Đổi mật khẩu"
            onClose={onClose}
            footer={
                <>
                    <button type="button" className="btn" onClick={onClose} disabled={busy}>
                        Huỷ
                    </button>
                    <button type="submit" form="change-password-form" className="btn btn-primary" disabled={busy}>
                        {busy ? 'Đang lưu…' : 'Đổi mật khẩu'}
                    </button>
                </>
            }
        >
            <Alert kind="error">{error}</Alert>
            <form id="change-password-form" onSubmit={submit}>
                <Field label="Mật khẩu hiện tại" required>
                    <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        autoComplete="current-password"
                        required
                    />
                </Field>
                <Field label="Mật khẩu mới" required>
                    <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={6}
                        required
                    />
                </Field>
                <Field label="Nhắp lại mật khẩu mới" required>
                    <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        autoComplete="new-password"
                        minLength={6}
                        required
                    />
                </Field>
            </form>
        </Modal>
    );
}

export default function Profile() {
    const { user, roles } = useAuth();
    const toast = useToast();
    const [items, setItems] = useState(null);
    const [error, setError] = useState('');
    const [changingPassword, setChangingPassword] = useState(false);

    useEffect(() => {
        let alive = true;
        assetHistoryApi
            .mine()
            .then((res) => alive && setItems(res ?? []))
            .catch((err) => alive && setError(err.message));
        return () => {
            alive = false;
        };
    }, []);

    const totalUnits = (items ?? []).reduce((sum, h) => sum + (h.quantity ?? 1), 0);

    return (
        <>
            <Alert kind="error">{error}</Alert>

            <div className="stat-grid">
                <div className="stat">
                    <div className="label">Tài sản đang sử dụng</div>
                    <div className="value accent">{items ? items.length : '…'}</div>
                </div>
                <div className="stat">
                    <div className="label">Tổng số đơn vị đang giữ</div>
                    <div className="value">{items ? totalUnits : '…'}</div>
                </div>
            </div>

            <div className="two-col">
                <Panel
                    title="Thông tin cá nhân"
                    actions={
                        <button className="btn btn-primary btn-lg" onClick={() => setChangingPassword(true)}>
                            Đổi mật khẩu
                        </button>
                    }
                >
                    <dl className="profile-list">
                        <InfoRow label="Họ và tên">{user?.name}</InfoRow>
                        <InfoRow label="Tên đăng nhập">
                            <span className="mono">{user?.username}</span>
                        </InfoRow>
                        <InfoRow label="Email">{user?.email}</InfoRow>
                        <InfoRow label="Phòng ban">{user?.departmentName}</InfoRow>
                        <InfoRow label="Chi nhánh">{user?.branchName}</InfoRow>
                        <InfoRow label="Vai trò">
                            {roles.length ? roles.map((r) => ROLE_LABEL[r] ?? r).join(' · ') : 'Chưa được gán vai trò'}
                        </InfoRow>
                    </dl>
                </Panel>

                <Panel
                    title="Tài sản đang sử dụng"
                    description="Các tài sản đã được cấp phát cho bạn và chưa trả lại."
                    bodyless
                >
                    {items === null && !error ? (
                        <Loading />
                    ) : !items || items.length === 0 ? (
                        <Empty
                            title="Bạn chưa được cấp tài sản nào"
                            hint="Khi một yêu cầu cấp phát được duyệt, tài sản sẽ xuất hiện ở đây."
                        />
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Tài sản</th>
                                        <th>Loại</th>
                                        <th>Serial</th>
                                        <th className="num">SL</th>
                                        <th>Nhận lúc</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((h) => (
                                        <tr key={h.id}>
                                            <td>
                                                <div className="cell-title">
                                                    <Link to={`/assets/${h.assetId}`}>{h.assetName}</Link>
                                                </div>
                                                <div className="cell-sub mono">{h.assetCode}</div>
                                            </td>
                                            <td>{h.categoryName}</td>
                                            <td className="mono">{h.serialNumber || '—'}</td>
                                            <td className="num">{h.quantity ?? 1}</td>
                                            <td>{formatDateTime(h.assignedAt)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Panel>
            </div>

            {changingPassword && (
                <ChangePasswordModal
                    onClose={() => setChangingPassword(false)}
                    onSaved={() => {
                        setChangingPassword(false);
                        toast.success('Đã đổi mật khẩu.');
                    }}
                />
            )}
        </>
    );
}
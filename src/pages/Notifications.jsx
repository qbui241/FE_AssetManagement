import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/endpoints';
import { Alert, Empty, Loading, Panel, formatDateTime } from '../components/ui';

export default function Notifications() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    notificationApi
      .list(unreadOnly)
      .then((res) => {
        setItems(res ?? []);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [unreadOnly]);

  useEffect(load, [load]);

  const open = async (n) => {
    if (!n.isRead) {
      try {
        await notificationApi.markRead(n.id);
      } catch {
        /* van dieu huong du danh dau that bai */
      }
    }
    if (n.relatedEntityType === 'APPROVAL_REQUEST') navigate(`/requests/${n.relatedEntityId}`);
    else if (n.relatedEntityType === 'ASSET') navigate(`/assets/${n.relatedEntityId}`);
    else load();
  };

  const unreadCount = items.filter((n) => !n.isRead).length;

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={`Thông báo${unreadCount ? ` (${unreadCount} chưa đọc)` : ''}`}
        actions={
          <>
            <button className="btn btn-sm" onClick={() => setUnreadOnly((v) => !v)}>
              {unreadOnly ? 'Xem tất cả' : 'Chỉ chưa đọc'}
            </button>
            <button
              className="btn btn-sm"
              disabled={unreadCount === 0}
              onClick={() =>
                notificationApi
                  .markAllRead()
                  .then(load)
                  .catch((err) => setError(err.message))
              }
            >
              Đánh dấu đã đọc tất cả
            </button>
          </>
        }
        bodyless
      >
        {loading ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty
            title={unreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            hint="Thông báo xuất hiện khi có yêu cầu cần bạn duyệt hoặc khi yêu cầu của bạn được xử lý."
          />
        ) : (
          items.map((n) => (
            <div
              key={n.id}
              className={`notif ${n.isRead ? '' : 'unread'}`}
              role="button"
              tabIndex={0}
              style={{ cursor: 'pointer' }}
              onClick={() => open(n)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  open(n);
                }
              }}
            >
              <div className="txt">
                <strong>{n.title}</strong>
                <p>{n.message}</p>
              </div>
              <div className="when">{formatDateTime(n.createdAt)}</div>
            </div>
          ))
        )}
      </Panel>
    </>
  );
}

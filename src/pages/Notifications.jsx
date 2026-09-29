import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { notificationApi } from '../api/endpoints';
import { Alert, Empty, Loading, Pagination, Panel, formatDateTime } from '../components/ui';

const PAGE_SIZE = 20;

// Backend tra ve co "isRead"; neu con ban DTO cu dung boolean nguyen thuy thi
// Jackson xuat ra "read". Chap nhan ca hai de khong phu thuoc phien ban backend.
const isReadOf = (n) => Boolean(n.isRead ?? n.read);

export default function Notifications() {
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [unread, setUnread] = useState(0);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      notificationApi.list({ unreadOnly, page, size: PAGE_SIZE }),
      notificationApi.unreadCount().catch(() => null),
    ])
      .then(([res, count]) => {
        if (res.content.length === 0 && res.page > 0) {
          setPage(res.page - 1);
          return;
        }
        setResult(res);
        setUnread(count?.unreadCount ?? 0);
        setError('');
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [unreadOnly, page]);

  useEffect(() => {
    load();
  }, [load]);

  const open = async (n) => {
    if (!isReadOf(n)) {
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

  const items = result?.content ?? [];

  return (
    <>
      <Alert kind="error">{error}</Alert>

      <Panel
        title={`Thông báo${unread ? ` (${unread} chưa đọc)` : ''}`}
        actions={
          <>
            <button
              className="btn btn-sm"
              onClick={() => {
                setUnreadOnly((v) => !v);
                setPage(0);
              }}
            >
              {unreadOnly ? 'Xem tất cả' : 'Chỉ chưa đọc'}
            </button>
            <button
              className="btn btn-sm"
              disabled={unread === 0}
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
        {loading && !result ? (
          <Loading />
        ) : items.length === 0 ? (
          <Empty
            title={unreadOnly ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
            hint="Thông báo xuất hiện khi có yêu cầu cần bạn duyệt hoặc khi yêu cầu của bạn được xử lý."
          />
        ) : (
          <>
            {items.map((n) => (
              <div
                key={n.id}
                className={`notif ${isReadOf(n) ? '' : 'unread'}`}
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
            ))}

            <Pagination
              page={page}
              totalPages={result?.totalPages ?? 0}
              totalElements={result?.totalElements ?? 0}
              onChange={setPage}
              unit="thông báo"
            />
          </>
        )}
      </Panel>
    </>
  );
}

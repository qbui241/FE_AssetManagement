import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const PAGE_META = {
  '/': { title: 'Tổng quan', sub: 'Tình hình tài sản và việc cần xử lý của bạn' },
  '/assets': { title: 'Tài sản', sub: 'Danh mục tài sản trong phạm vi bạn được xem' },
  '/requests': { title: 'Yêu cầu của tôi', sub: 'Các đề xuất cấp phát và thanh lý bạn đã gửi' },
  '/requests/all': { title: 'Tất cả yêu cầu', sub: 'Toàn bộ yêu cầu trong phạm vi quản lý' },
  '/tasks': { title: 'Chờ tôi duyệt', sub: 'Các bước phê duyệt đang đợi quyết định của bạn' },
  '/notifications': { title: 'Thông báo', sub: 'Cập nhật về yêu cầu và tài sản liên quan đến bạn' },
  '/admin/users': { title: 'Người dùng', sub: 'Tài khoản nội bộ và vai trò được gán' },
  '/admin/organization': { title: 'Chi nhánh & Phòng ban', sub: 'Cơ cấu tổ chức dùng cho phân quyền theo phạm vi' },
  '/admin/categories': { title: 'Danh mục & Thuộc tính', sub: 'Loại tài sản và các thông số kỹ thuật đi kèm' },
  '/admin/workflows': { title: 'Quy trình duyệt', sub: 'Cấu hình các bước phê duyệt và điều kiện áp dụng' },
  '/audit-logs': { title: 'Nhật ký hệ thống', sub: 'Tra cứu lịch sử tác động lên tài sản và yêu cầu' },
  '/asset-histories': { title: 'Lịch sử cấp phát', sub: 'Ai đã mượn tài sản nào, trong khoảng thời gian nào' },
};

function metaFor(pathname) {
  if (PAGE_META[pathname]) return PAGE_META[pathname];
  if (pathname.startsWith('/assets/')) return { title: 'Chi tiết tài sản', sub: '' };
  if (pathname.startsWith('/requests/')) return { title: 'Chi tiết yêu cầu', sub: '' };
  return { title: 'Quản lý tài sản', sub: '' };
}

export default function Layout() {
  const { user, roles, logout, hasRole, hasNoRole, unreadCount } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const canApprove = hasRole('MANAGER', 'DIRECTOR', 'ADMIN');
  const canSeeAudit = hasRole('MANAGER', 'DIRECTOR', 'ADMIN');
  const canConfigure = hasRole('MANAGER', 'DIRECTOR', 'ADMIN');
  const meta = metaFor(location.pathname);

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <strong>Quản lý tài sản</strong>
          <span>Hệ thống nội bộ</span>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Tổng quan
          </NavLink>
          <NavLink to="/assets" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            Tài sản
          </NavLink>

          <div className="sidebar-group">Phê duyệt</div>
          {!hasRole('ADMIN') && (
            <NavLink to="/requests" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              Yêu cầu của tôi
            </NavLink>
          )}
          {canApprove && (
            <>
              <NavLink
                to="/requests/all"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Tất cả yêu cầu
              </NavLink>
              <NavLink to="/tasks" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                Chờ tôi duyệt
              </NavLink>
            </>
          )}

          {canConfigure && (
            <>
              <div className="sidebar-group">Quản trị</div>
              {(canApprove || hasRole('ADMIN')) && (
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Người dùng
                </NavLink>
              )}
              <NavLink
                to="/admin/organization"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Chi nhánh & Phòng ban
              </NavLink>
              <NavLink
                to="/admin/categories"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Danh mục & Thuộc tính
              </NavLink>
              <NavLink
                to="/admin/workflows"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Quy trình duyệt
              </NavLink>
            </>
          )}

          {canSeeAudit && (
            <>
              <div className="sidebar-group">Tra cứu</div>
              <NavLink
                to="/audit-logs"
                className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              >
                Nhật ký hệ thống
              </NavLink>
              {canApprove && (
                <NavLink
                  to="/asset-histories"
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  Lịch sử cấp phát
                </NavLink>
              )}
            </>
          )}

          <div className="sidebar-group">Cá nhân</div>
          <NavLink
            to="/notifications"
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
          >
            <span>Thông báo</span>
            {unreadCount > 0 && <span className="count">{unreadCount}</span>}
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="who">{user?.name}</div>
          <div className="meta">
            {roles.length ? roles.join(' · ') : 'Chưa được gán vai trò'}
          </div>
          <button
            type="button"
            className="btn btn-sm"
            style={{ width: '100%' }}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="topbar-title">
            <h1>{meta.title}</h1>
            {meta.sub && <p>{meta.sub}</p>}
          </div>
          <div className="bell">
            <NavLink to="/notifications">Thông báo</NavLink>
            {unreadCount > 0 && <span className="count">{unreadCount}</span>}
          </div>
        </header>

        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
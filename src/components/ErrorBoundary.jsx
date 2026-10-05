import { Component } from 'react';

/**
 * Bat loi render/runtime tu cay component con (page hien tai) va hien mot
 * trang loi thay vi de man hinh trang trang. React Error Boundary chi bat
 * duoc loi xay ra trong qua trinh render/lifecycle, khong bat duoc loi trong
 * handler async (promise reject) - nhung da du cho truong hop TypeError khi
 * render nhu `assets.filter is not a function`.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Loi khong bat duoc trong trang:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Neu day la boundary theo tung trang (co resetKey doi theo route), tu
    // reset khi nguoi dung dieu huong sang trang khac de khong bi ket loi cu.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorPage
          error={this.state.error}
          onRetry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

export function ErrorPage({ error, onRetry }) {
  return (
    <div className="error-page">
      <div className="error-page-card">
        <div className="error-page-icon" aria-hidden="true">
          !
        </div>
        <h1>Đã có lỗi xảy ra</h1>
        <p>Trang này gặp sự cố và không thể hiển thị. Bạn có thể thử lại hoặc quay về trang chủ.</p>
        {error?.message && (
          <pre className="error-page-detail">{String(error.message)}</pre>
        )}
        <div className="btn-row" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn" onClick={onRetry}>
            Thử lại
          </button>
          <button type="button" className="btn btn-primary" onClick={() => (window.location.href = '/')}>
            Về trang chủ
          </button>
        </div>
      </div>
    </div>
  );
}

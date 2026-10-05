const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';
const TOKEN_KEY = 'am_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function extractError(response) {
  const raw = await response.text();

  if (!raw) {
    if (response.status === 401) return 'Phiên đăng nhập đã hết hạn.';
    if (response.status === 403) return 'Bạn không có quyền thực hiện thao tác này.';
    return `Lỗi ${response.status}`;
  }

  try {
    const data = JSON.parse(raw);
    if (typeof data === 'string') return data;

    if (data.errors && typeof data.errors === 'object') {
      const fieldErrors = Object.entries(data.errors).map(([field, msg]) => `${field}: ${msg}`);
      if (fieldErrors.length) return fieldErrors.join(' · ');
    }
    if (data.message) return data.message;
    if (data.error) return data.error;

    // Du phong cho dang {field: "message"} khong boc trong "errors"
    const entries = Object.entries(data).filter(
      ([key, value]) => typeof value === 'string' && !['timestamp', 'path', 'status'].includes(key)
    );
    if (entries.length) {
      return entries.map(([key, value]) => `${key}: ${value}`).join(' · ');
    }
    return raw;
  } catch {
    return raw;
  }
}

async function request(path, { method = 'GET', body, auth = true, raw = false } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (response.status === 401) {
    clearToken();
    // Cho AuthContext biet de dua nguoi dung ve trang dang nhap.
    window.dispatchEvent(new CustomEvent('am:unauthorized'));
    throw new ApiError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 401);
  }

  if (!response.ok) {
    throw new ApiError(await extractError(response), response.status);
  }

  // POST /api/auth/login tra ve JWT dang chuoi tho, khong phai JSON.
  if (raw) return response.text();

  if (response.status === 204) return null;

  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
  postRaw: (path, body, auth = true) => request(path, { method: 'POST', body, raw: true, auth }),
};
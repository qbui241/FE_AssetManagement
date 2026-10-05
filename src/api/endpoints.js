import { api, getToken } from './client';

export function qs(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.set(key, value);
  });
  const text = search.toString();
  return text ? `?${text}` : '';
}


export const authApi = {
  login: (username, password) =>
    api.postRaw('/api/auth/login', { username, password }, false),
};

export const userApi = {
  me: () => api.get('/api/users/me'),
  list: (params) => api.get(`/api/users${qs(params)}`),
  listAll: () => api.get('/api/users?size=100'),
  get: (id) => api.get(`/api/users/${id}`),
  create: (payload) => api.post('/api/users', payload),
  update: (id, payload) => api.put(`/api/users/${id}`, payload),
  remove: (id) => api.del(`/api/users/${id}`),
  assignRole: (userId, roleId) => api.post(`/api/users/${userId}/roles/${roleId}`),
};

export const assetApi = {
  list: (params) => api.get(`/api/assets${qs(params)}`),
  get: (id) => api.get(`/api/assets/${id}`),
  create: (payload) => api.post('/api/assets', payload),
  update: (id, payload) => api.put(`/api/assets/${id}`, payload),
  remove: (id) => api.del(`/api/assets/${id}`),

  // Chuyen trang thai (INDIVIDUAL)
  assign: (id, userId) => api.post(`/api/assets/${id}/assign`, { userId }),
  returnAsset: (id) => api.post(`/api/assets/${id}/return`),
  maintenance: (id) => api.post(`/api/assets/${id}/maintenance`),
  makeAvailable: (id) => api.post(`/api/assets/${id}/available`),
  dispose: (id) => api.post(`/api/assets/${id}/dispose`),

  // Theo so luong (BULK)
  assignQuantity: (id, userId, quantity) =>
    api.post(`/api/assets/${id}/assign-quantity`, { userId, quantity }),
  returnQuantity: (id, historyId) => api.post(`/api/assets/${id}/return-quantity/${historyId}`),
  disposeQuantity: (id, quantity) => api.post(`/api/assets/${id}/dispose-quantity`, { quantity }),
};

export const categoryApi = {
  list: () => api.get('/api/categories'),
  get: (id) => api.get(`/api/categories/${id}`),
  create: (payload) => api.post('/api/categories', payload),
  update: (id, payload) => api.put(`/api/categories/${id}`, payload),
  remove: (id) => api.del(`/api/categories/${id}`),
};

export const attributeApi = {
  list: () => api.get('/api/attribute-definitions'),
  byCategory: (categoryId) => api.get(`/api/attribute-definitions/category/${categoryId}`),
  create: (payload) => api.post('/api/attribute-definitions', payload),
  update: (id, payload) => api.put(`/api/attribute-definitions/${id}`, payload),
  remove: (id) => api.del(`/api/attribute-definitions/${id}`),
};

export const approvalRequestApi = {
  // Tra ve PageResponse { content, page, size, totalElements, totalPages }.
  // params: { status, page, size }
  listAll: (params) => api.get(`/api/approval-requests${qs(params)}`),
  listMine: (params) => api.get(`/api/approval-requests/mine${qs(params)}`),
  get: (id) => api.get(`/api/approval-requests/${id}`),
  tasksOf: (requestId) => api.get(`/api/approval-requests/${requestId}/tasks`),
  create: (payload) => api.post('/api/approval-requests', payload),
};

export const approvalTaskApi = {
  // "Cho toi duyet": chi gom task nguoi dung hien tai dang duoc phep xu ly.
  // params: { page, size } -> PageResponse
  mine: (params) => api.get(`/api/approval-tasks/mine${qs(params)}`),
  list: (params) => api.get(`/api/approval-tasks${qs(params)}`),
  approve: (taskId) => api.post(`/api/approval-tasks/${taskId}/approve`),
  reject: (taskId) => api.post(`/api/approval-tasks/${taskId}/reject`),
};

export const notificationApi = {
  list: (params) => api.get(`/api/notifications${qs(params)}`),
  unreadCount: () => api.get('/api/notifications/unread-count'),
  markRead: (id) => api.patch(`/api/notifications/${id}/read`),
  markAllRead: () => api.patch('/api/notifications/read-all'),
  // URL cho EventSource. EventSource khong the tu set header Authorization nen
  // phai truyen JWT qua query param rieng (backend chi chap nhan fallback nay
  // cho dung endpoint /stream, xem JwtAuthenticationFilter).
  streamUrl: () => {
    const base = import.meta.env.VITE_API_BASE_URL ?? '';
    return `${base}/api/notifications/stream?access_token=${encodeURIComponent(getToken() ?? '')}`;
  },
};

export const departmentApi = {
  list: () => api.get('/api/departments'),
  get: (id) => api.get(`/api/departments/${id}`),
  create: (payload) => api.post('/api/departments', payload),
  update: (id, payload) => api.put(`/api/departments/${id}`, payload),
  remove: (id) => api.del(`/api/departments/${id}`),
};

export const branchApi = {
  list: () => api.get('/api/branches'),
  get: (id) => api.get(`/api/branches/${id}`),
  create: (payload) => api.post('/api/branches', payload),
  update: (id, payload) => api.put(`/api/branches/${id}`, payload),
  remove: (id) => api.del(`/api/branches/${id}`),
};

export const roleApi = {
  list: () => api.get('/api/roles'),
  create: (payload) => api.post('/api/roles', payload),
  update: (id, payload) => api.put(`/api/roles/${id}`, payload),
  remove: (id) => api.del(`/api/roles/${id}`),
};

export const workflowApi = {
  list: () => api.get('/api/approval-workflows'),
  get: (id) => api.get(`/api/approval-workflows/${id}`),
  create: (payload) => api.post('/api/approval-workflows', payload),
  update: (id, payload) => api.put(`/api/approval-workflows/${id}`, payload),
  remove: (id) => api.del(`/api/approval-workflows/${id}`),
};

export const stepApi = {
  list: () => api.get('/api/approval-steps'),
  get: (id) => api.get(`/api/approval-steps/${id}`),
  create: (payload) => api.post('/api/approval-steps', payload),
  update: (id, payload) => api.put(`/api/approval-steps/${id}`, payload),
  remove: (id) => api.del(`/api/approval-steps/${id}`),
};

export const auditLogApi = {
  // params: { action, entityType, from, to, page, size } -> PageResponse
  list: (params) => api.get(`/api/audit-logs${qs(params)}`),
  byEntity: (entityType, entityId) =>
    api.get(`/api/audit-logs/entity?entityType=${entityType}&entityId=${entityId}`),
};

export const dashboardApi = {
  stats: () => api.get('/api/dashboard/stats'),
};

export const assetHistoryApi = {
  // params: { assetId, userId, openOnly, q, page, size } -> PageResponse
  list: (params) => api.get(`/api/asset-histories${qs(params)}`),
};
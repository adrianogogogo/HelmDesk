import axios from 'axios';
import toast from 'react-hot-toast';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://177.153.39.134:5000/api',
  timeout: 30000,
});

// Request interceptor — add token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('relmdesk_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('relmdesk_token');
      localStorage.removeItem('relmdesk_user');
      window.location.href = '/login';
    }
    const message = error.response?.data?.error || error.message || 'Erro inesperado';
    if (error.response?.status !== 401) {
      toast.error(message);
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
  register: (data) => api.post('/auth/register', data),
  changePassword: (data) => api.post('/auth/change-password', data),
  getDepartments: () => api.get('/auth/departments'),
};

// Tickets
export const ticketAPI = {
  list: (params) => api.get('/tickets', { params }),
  getById: (id) => api.get(`/tickets/${id}`),
  create: (data) => api.post('/tickets', data),
  update: (id, data) => api.patch(`/tickets/${id}`, data),
  updateStatus: (id, data) => api.patch(`/tickets/${id}/status`, data),
  addProduct: (id, data) => api.post(`/tickets/${id}/products`, data),
  removeProduct: (id, productId) => api.delete(`/tickets/${id}/products/${productId}`),
  addSolution: (id, data) => api.post(`/tickets/${id}/solutions`, data),
  approveSolution: (id, solutionId, data) => api.patch(`/tickets/${id}/solutions/${solutionId}/approve`, data),
  uploadAttachments: (id, formData) => api.post(`/tickets/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  addBlock: (id, data) => api.post(`/tickets/${id}/blocks`, data),
  updateBlock: (id, blockId, data) => api.patch(`/tickets/${id}/blocks/${blockId}`, data),
  getStatuses: () => api.get('/tickets/meta/statuses'),
  anonymize: (id) => api.post(`/tickets/${id}/anonymize`),
};

// Tasks
export const taskAPI = {
  list: (params) => api.get('/tasks', { params }),
  kanban: (params) => api.get('/tasks/kanban', { params }),
  create: (data) => api.post('/tasks', data),
  update: (id, data) => api.patch(`/tasks/${id}`, data),
  delete: (id) => api.delete(`/tasks/${id}`),
  whatsapp: (id) => api.get(`/tasks/${id}/whatsapp`),
};

// Search
export const searchAPI = {
  search: (q, limit) => api.get('/search', { params: { q, limit } }),
  suggest: (q) => api.get('/search/suggest', { params: { q } }),
};

// Dashboard
export const dashboardAPI = {
  get: () => api.get('/dashboard'),
};

// Users
export const userAPI = {
  list: () => api.get('/users'),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.patch(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

// Stores
export const storeAPI = {
  list: () => api.get('/stores'),
  create: (data) => api.post('/stores', data),
  update: (id, data) => api.patch(`/stores/${id}`, data),
};

// Products
export const productAPI = {
  list: (params) => api.get('/products', { params }),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.patch(`/products/${id}`, data),
};

// Brands
export const brandAPI = {
  list: () => api.get('/brands'),
};

// Issue types
export const issueAPI = {
  list: () => api.get('/issue-types'),
};

// Chat
export const chatAPI = {
  getUsers: () => api.get('/chat/users'),
  getRooms: () => api.get('/chat/rooms'),
  createRoom: (data) => api.post('/chat/rooms', data),
  getMessages: (roomId, params) => api.get(`/chat/rooms/${roomId}/messages`, { params }),
};

// Notifications
export const notificationAPI = {
  list: () => api.get('/notifications'),
  readAll: () => api.patch('/notifications/read-all'),
  read: (id) => api.patch(`/notifications/${id}/read`),
};

// Gamification
export const gamificationAPI = {
  ranking: (params) => api.get('/gamification/ranking', { params }),
  myGoals: (params) => api.get('/gamification/my-goals', { params }),
  championship: () => api.get('/gamification/championship'),
};

// Reports
export const reportAPI = {
  tickets: (params) => api.get('/reports/tickets', { params }),
};

// Config
export const configAPI = {
  list: () => api.get('/config'),
  update: (key, value) => api.patch(`/config/${key}`, { value }),
  blockTypes: () => api.get('/config/block-types'),
};

// Public (no auth)
export const publicAPI = {
  createTicket: (data) => api.post('/public/tickets', data),
  trackTicket: (token) => api.get(`/public/tickets/${token}`),
  getBrands: () => api.get('/public/brands'),
  getIssueTypes: () => api.get('/public/issue-types'),
};

export default api;

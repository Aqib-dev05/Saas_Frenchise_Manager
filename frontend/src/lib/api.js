import axios from 'axios'

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fm_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
}, Promise.reject)

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('fm_token')
      localStorage.removeItem('fm_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login:    (d) => api.post('/auth/login', d),
  register: (d) => api.post('/auth/register', d),
  getMe:    ()  => api.get('/auth/me'),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
  resetPassword:  (d) => api.post('/auth/reset-password', d),
}

// ── Users ─────────────────────────────────────────────────────────────────────
export const userApi = {
  getAll:  ()       => api.get('/users'),
  create:  (d)      => api.post('/users', d),
  update:  (id, d)  => api.put(`/users/${id}`, d),
  delete:  (id)     => api.delete(`/users/${id}`),
}

// ── Products ──────────────────────────────────────────────────────────────────
export const productApi = {
  getAll:       (p)      => api.get('/products', { params: p }),
  // Dropdowns/lookups (order-booking product picker) — lite:true is baked in
  // here, not repeated at every call-site.
  getLookup:    (p)      => api.get('/products', { params: { ...p, lite: true } }),
  getById:      (id)     => api.get(`/products/${id}`),
  getLowStock:  ()       => api.get('/products/low-stock'),
  getCategories:()       => api.get('/products/categories'),
  create:       (d)      => api.post('/products', d),
  update:       (id, d)  => api.put(`/products/${id}`, d),
  delete:       (id)     => api.delete(`/products/${id}`),
}

// ── Shops ─────────────────────────────────────────────────────────────────────
export const shopApi = {
  getAll:          (p)     => api.get('/shops', { params: p }),
  // Dropdowns/lookups (route shop-picker, payment shop-selector) — same idea.
  getLookup:       (p)     => api.get('/shops', { params: { ...p, lite: true } }),
  getById:         (id)    => api.get(`/shops/${id}`),
  getTransactions: (id)    => api.get(`/shops/${id}/transactions`),
  create:          (d)     => api.post('/shops', d),
  update:          (id, d) => api.put(`/shops/${id}`, d),
  delete:          (id)    => api.delete(`/shops/${id}`),
  // Shop-owner portal access (admin only) — generate returns the plaintext
  // password exactly once; it is never retrievable again after this call.
  generatePortalCredentials: (id) => api.post(`/shops/${id}/portal/credentials`),
  togglePortalAccess:        (id, enabled) => api.put(`/shops/${id}/portal/toggle`, { enabled }),
}

// ── Routes ────────────────────────────────────────────────────────────────────
export const routeApi = {
  getAll:      ()            => api.get('/routes'),
  getById:     (id)          => api.get(`/routes/${id}`),
  getToday:    ()            => api.get('/routes/today'),
  create:      (d)           => api.post('/routes', d),
  update:      (id, d)       => api.put(`/routes/${id}`, d),
  delete:      (id)          => api.delete(`/routes/${id}`),
  addShop:     (rId, d)      => api.post(`/routes/${rId}/shops`, d),
  removeShop:  (rId, sId)    => api.delete(`/routes/${rId}/shops/${sId}`),
  reorder:     (rId, d)      => api.put(`/routes/${rId}/reorder`, d),
}

// ── Orders ────────────────────────────────────────────────────────────────────
export const orderApi = {
  getAll:       (p)      => api.get('/orders', { params: p }),
  getById:      (id)     => api.get(`/orders/${id}`),
  getToday:     ()       => api.get('/orders/today'),
  create:       (d)      => api.post('/orders', d),
  update:       (id, d)  => api.put(`/orders/${id}`, d),
  updateStatus: (id, d)  => api.put(`/orders/${id}/status`, d),
}

// ── Payments ──────────────────────────────────────────────────────────────────
export const paymentApi = {
  getAll:    (p)  => api.get('/payments', { params: p }),
  getByShop: (id) => api.get(`/payments/shop/${id}`),
  create:    (d)  => api.post('/payments', d),
}

// ── Deliveries ────────────────────────────────────────────────────────────────
export const deliveryApi = {
  getAll:       (p)     => api.get('/deliveries', { params: p }),
  updateStatus: (id, d) => api.put(`/deliveries/${id}/status`, d),
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export const dashboardApi = {
  getStats:      ()    => api.get('/dashboard/stats'),
  getDailySales: (d)   => api.get('/dashboard/daily-sales', { params: { days: d } }),
  getLowStock:   ()    => api.get('/dashboard/low-stock'),
  getTopShops:   ()    => api.get('/dashboard/top-shops'),
  getCreditReport: ()  => api.get('/dashboard/credit-report'),
}

// ── Organization ──────────────────────────────────────────────────────────────
export const orgApi = {
  get:    ()  => api.get('/organization'),
  update: (d) => api.put('/organization', d),
}

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  uploadImage: (file, folder = 'general') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('folder', folder)
    // Let the browser set the multipart boundary itself — overriding the
    // instance's default 'application/json' header is required for FormData.
    return api.post('/upload/image', formData, { headers: { 'Content-Type': undefined } })
  },
}

// ── Subscription ──────────────────────────────────────────────────────────────
export const subscriptionApi = {
  getPlans:      ()  => api.get('/subscription/plans'),
  get:           ()  => api.get('/subscription'),
  getPaddleConfig: () => api.get('/subscription/paddle-config'),
  activate:      (d) => api.post('/subscription/activate', d),
  cancel:        ()  => api.post('/subscription/cancel'),
}

// ── Invoices ──────────────────────────────────────────────────────────────────
export const invoiceApi = {
  // Returns a PDF blob — caller is responsible for triggering the browser download.
  downloadPdf: (orderId) => api.get(`/invoices/${orderId}/pdf`, { responseType: 'blob' }),
  // Admin-only: clears cached PDF files (Cloudinary + DB pointers). Does not
  // touch invoice amount/paid/isPaid — the payment ledger stays intact.
  clearHistory: () => api.delete('/invoices/history'),
}

// ── Bills (shopkeeper-facing receipt, works on any order status) ────────────
// Separate from the formal invoice — no caching, no Cloudinary. Built fresh
// on demand. Salesman: own orders only. Admin/Delivery: any order in org.
export const billApi = {
  download: (orderId) => api.get(`/bills/${orderId}`, { responseType: 'blob' }),
}

// ── Export (Admin only) ────────────────────────────────────────────────────────
export const exportApi = {
  // type: products | users | shops | credit-report | payments | orders |
  //       daily-sales | monthly-sales | product-sales-ratio
  download: (type, params) => api.get(`/export/${type}`, { params, responseType: 'blob' }),
}

// ── Audit Log (Admin only, read-only) ───────────────────────────────────────────
export const auditApi = {
  getAll:     (params) => api.get('/audit-logs', { params }),
  getFilters: ()       => api.get('/audit-logs/filters'),
}

// ── Skipped Visits ─────────────────────────────────────────────────────────────
// Salesman creates (marks a shop as "couldn't visit today").
// Admin + Salesman read (admin sees all org's, salesman sees own).
// Admin or creating Salesman resolves (follow-up done).
export const skippedVisitApi = {
  create:  (d)  => api.post('/skipped-visits', d),
  getAll:  (p)  => api.get('/skipped-visits', { params: p }),
  resolve: (id) => api.put(`/skipped-visits/${id}/resolve`),
}

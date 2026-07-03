import axios from 'axios'

const shopPortalApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
})

shopPortalApi.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('fm_shop_token')
    if (token) config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

shopPortalApi.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('fm_shop_token')
      localStorage.removeItem('fm_shop_data')
      // Deliberately /shop-portal/login, not /login — a shop-portal session
      // expiring must never bounce the shop owner into the staff login page.
      window.location.href = '/shop-portal/login'
    }
    return Promise.reject(err)
  }
)

export default shopPortalApi

export const shopPortalAuthApi = {
  login: (code, password) => shopPortalApi.post('/shop-portal/login', { code, password }),
}

export const shopPortalDataApi = {
  getMe:      ()       => shopPortalApi.get('/shop-portal/me'),
  getOrders:  (params) => shopPortalApi.get('/shop-portal/orders', { params }),
  getOrder:   (id)     => shopPortalApi.get(`/shop-portal/orders/${id}`),
  getPayments: ()      => shopPortalApi.get('/shop-portal/payments'),
  getLedger:  ()       => shopPortalApi.get('/shop-portal/ledger'),
  downloadInvoicePdf: (orderId) => shopPortalApi.get(`/shop-portal/invoices/${orderId}/pdf`, { responseType: 'blob' }),
  downloadBill:       (orderId) => shopPortalApi.get(`/shop-portal/bills/${orderId}`, { responseType: 'blob' }),
}

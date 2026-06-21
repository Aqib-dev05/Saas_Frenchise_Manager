export const formatCurrency = (amount) => {
  const num = parseFloat(amount || 0)
  return `Rs. ${num.toLocaleString('en-PK', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

export const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('en-PK', { year: 'numeric', month: 'short', day: 'numeric' })
}

export const formatDateTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('en-PK', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export const formatTime = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })
}

export const DAY_NAMES  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
export const DAY_SHORT  = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
export const getDayNames = (days) => !days?.length ? 'No days set' : days.map(d => DAY_SHORT[d]).join(', ')

export const STATUS_COLORS = {
  PENDING:   'bg-yellow-100 text-yellow-800',
  CONFIRMED: 'bg-blue-100  text-blue-800',
  DISPATCHED:'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100  text-green-800',
  CANCELLED: 'bg-red-100    text-red-800',
}

export const SHOP_TYPE_COLORS = {
  RETAIL:    'bg-gray-100   text-gray-700',
  WHOLESALE: 'bg-blue-100   text-blue-700',
  CREDIT:    'bg-orange-100 text-orange-700',
  CASH:      'bg-emerald-100 text-emerald-700',
}

export const DELIVERY_STATUS_COLORS = {
  PENDING:    'bg-slate-100  text-slate-700',
  IN_TRANSIT: 'bg-yellow-100 text-yellow-700',
  DELIVERED:  'bg-green-100  text-green-700',
  FAILED:     'bg-red-100    text-red-700',
}

export const getErrorMessage = (error) =>
  error?.response?.data?.message || error?.message || 'Something went wrong'

export const getInitials = (name) =>
  name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?'

export const ROLES        = { ADMIN: 'Admin', SALESMAN: 'Salesman', DELIVERY: 'Delivery' }
export const SHOP_TYPES   = ['RETAIL', 'WHOLESALE', 'CREDIT', 'CASH']
export const PAYMENT_TYPES= ['CASH', 'CREDIT', 'BANK_TRANSFER', 'CHEQUE']
export const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED']

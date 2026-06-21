import { STATUS_COLORS, SHOP_TYPE_COLORS, DELIVERY_STATUS_COLORS } from '@/lib/utils'
export const StatusBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>
)
export const ShopTypeBadge = ({ type }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${SHOP_TYPE_COLORS[type] || 'bg-gray-100 text-gray-700'}`}>{type}</span>
)
export const DeliveryBadge = ({ status }) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${DELIVERY_STATUS_COLORS[status] || 'bg-gray-100 text-gray-700'}`}>{status?.replace('_',' ')}</span>
)
export const RoleBadge = ({ role }) => {
  const colors = { ADMIN: 'bg-purple-100 text-purple-800', SALESMAN: 'bg-blue-100 text-blue-800', DELIVERY: 'bg-orange-100 text-orange-800' }
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[role] || 'bg-gray-100 text-gray-700'}`}>{role}</span>
}

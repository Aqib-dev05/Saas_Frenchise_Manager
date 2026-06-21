'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { orderApi } from '@/lib/api'
import { formatCurrency, formatDateTime, getErrorMessage, ORDER_STATUSES } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Eye, CheckCircle, XCircle, Truck, Package } from 'lucide-react'

export default function OrdersPage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [viewOrder, setViewOrder] = useState(null)

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['orders', statusFilter, dateFilter],
    queryFn: () => orderApi.getAll({ status: statusFilter || undefined, date: dateFilter || undefined, limit: 100 }).then(r => r.data),
    refetchInterval: 30000,
  })

  const statusM = useMutation({
    mutationFn: ({ id, status }) => orderApi.updateStatus(id, { status }),
    onSuccess: (_, { status }) => { toast.success(`Order ${status.toLowerCase()}`); qc.invalidateQueries(['orders']); setViewOrder(null) },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const orders = data?.orders || []

  const actionButtons = (order) => {
    const btns = []
    if (order.status === 'PENDING') {
      btns.push(<button key="confirm" onClick={() => statusM.mutate({ id: order.id, status: 'CONFIRMED' })} className="flex items-center gap-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg"><CheckCircle className="w-3.5 h-3.5" />Confirm</button>)
      btns.push(<button key="cancel" onClick={() => statusM.mutate({ id: order.id, status: 'CANCELLED' })} className="flex items-center gap-1.5 text-xs bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg"><XCircle className="w-3.5 h-3.5" />Cancel</button>)
    }
    if (order.status === 'CONFIRMED') {
      btns.push(<button key="dispatch" onClick={() => statusM.mutate({ id: order.id, status: 'DISPATCHED' })} className="flex items-center gap-1.5 text-xs bg-orange-600 hover:bg-orange-700 text-white px-3 py-1.5 rounded-lg"><Truck className="w-3.5 h-3.5" />Dispatch</button>)
    }
    if (order.status === 'DISPATCHED') {
      btns.push(<button key="deliver" onClick={() => statusM.mutate({ id: order.id, status: 'DELIVERED' })} className="flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg"><Package className="w-3.5 h-3.5" />Mark Delivered</button>)
    }
    return btns
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Orders</h1><p className="text-gray-500 text-sm">{orders.length} orders</p></div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <select className="input max-w-[180px]" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="">All Statuses</option>
          {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input type="date" className="input max-w-[180px]" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
        {(statusFilter || dateFilter) && <button onClick={() => { setStatusFilter(''); setDateFilter('') }} className="btn-secondary text-sm">Clear</button>}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-4 py-3">Order No</th>
              <th className="text-left px-4 py-3">Shop</th>
              <th className="text-left px-4 py-3">Salesman</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => (
                <tr key={o.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{o.orderNo}</td>
                  <td className="px-4 py-3">
                    <div><p className="font-medium text-gray-900">{o.shop?.name}</p><p className="text-xs text-gray-400">{o.shop?.type}</p></div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{o.salesman?.name}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{formatDateTime(o.orderDate)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button onClick={() => setViewOrder(o)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50"><Eye className="w-4 h-4" /></button>
                      {actionButtons(o)}
                    </div>
                  </td>
                </tr>
              ))}
              {orders.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-12">No orders found</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!viewOrder} onClose={() => setViewOrder(null)} title={`Order: ${viewOrder?.orderNo}`} size="lg">
        {viewOrder && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p><span className="text-gray-500">Shop:</span> <span className="font-medium ml-1">{viewOrder.shop?.name}</span></p>
                <p><span className="text-gray-500">Owner:</span> <span className="font-medium ml-1">{viewOrder.shop?.ownerName}</span></p>
                <p><span className="text-gray-500">Type:</span> <span className="font-medium ml-1">{viewOrder.shop?.type}</span></p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <p><span className="text-gray-500">Salesman:</span> <span className="font-medium ml-1">{viewOrder.salesman?.name}</span></p>
                <p><span className="text-gray-500">Date:</span> <span className="font-medium ml-1">{formatDateTime(viewOrder.orderDate)}</span></p>
                <p><span className="text-gray-500">Status:</span> <StatusBadge status={viewOrder.status} /></p>
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Order Items</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2">Product</th><th className="text-right pb-2">Qty</th><th className="text-right pb-2">Price</th><th className="text-right pb-2">Subtotal</th>
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {viewOrder.items?.map(item => (
                    <tr key={item.id}>
                      <td className="py-2 font-medium text-gray-900">{item.product?.name}</td>
                      <td className="py-2 text-right text-gray-600">{item.quantity} {item.product?.unit}</td>
                      <td className="py-2 text-right text-gray-600">{formatCurrency(item.price)}</td>
                      <td className="py-2 text-right font-semibold">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot><tr className="border-t-2 border-gray-200">
                  <td colSpan={3} className="pt-3 text-right font-bold text-gray-900">Total</td>
                  <td className="pt-3 text-right font-bold text-indigo-600 text-base">{formatCurrency(viewOrder.totalAmount)}</td>
                </tr></tfoot>
              </table>
            </div>
            <div className="flex gap-2 flex-wrap border-t pt-4">{actionButtons(viewOrder)}</div>
          </div>
        )}
      </Modal>
    </div>
  )
}

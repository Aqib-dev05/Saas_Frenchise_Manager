'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { orderApi, deliveryApi } from '@/lib/api'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { Truck, Package, CheckCircle, Clock, Map, List, AlertCircle, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react'

const DeliveryMap = dynamic(() => import('@/components/delivery/DeliveryMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <Map className="w-8 h-8 text-slate-400 animate-pulse" />
    </div>
  ),
})

function DeliveryCard({ delivery, onMarkDelivered, loading }) {
  const [expanded, setExpanded] = useState(false)
  const order = delivery.order
  const shop = order?.shop
  const status = delivery.status

  const statusConfig = {
    PENDING:     { color: 'border-slate-200  bg-slate-50',   badge: 'bg-slate-100 text-slate-700',   label: 'Pending' },
    IN_TRANSIT:  { color: 'border-amber-200  bg-amber-50',   badge: 'bg-amber-100 text-amber-700',   label: 'In Transit' },
    DELIVERED:   { color: 'border-emerald-200 bg-emerald-50', badge: 'bg-emerald-100 text-emerald-700', label: 'Delivered' },
    FAILED:      { color: 'border-red-200    bg-red-50',     badge: 'bg-red-100 text-red-700',       label: 'Failed' },
  }[status] || { color: 'border-gray-200 bg-white', badge: 'bg-gray-100 text-gray-600', label: status }

  return (
    <div className={`rounded-2xl border-2 overflow-hidden transition-all ${statusConfig.color}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Status icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              status === 'DELIVERED' ? 'bg-emerald-500' : status === 'IN_TRANSIT' ? 'bg-amber-500' : 'bg-slate-400'
            }`}>
              {status === 'DELIVERED'
                ? <CheckCircle className="w-5 h-5 text-white" />
                : <Truck className="w-5 h-5 text-white" />
              }
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-gray-900">{shop?.name}</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusConfig.badge}`}>{statusConfig.label}</span>
              </div>
              <p className="text-sm text-gray-500 mt-0.5">{shop?.ownerName} · {shop?.phone}</p>
              <p className="text-xs text-gray-400">{shop?.address}</p>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="font-bold text-gray-900 text-lg">{formatCurrency(order?.totalAmount)}</p>
            <p className="text-xs text-gray-400">{order?.items?.length} items</p>
          </div>
        </div>

        {/* Order meta */}
        <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
          <span className="font-mono bg-gray-100 px-2 py-0.5 rounded">{order?.orderNo}</span>
          <span className={`px-2 py-0.5 rounded-full font-medium ${
            shop?.type === 'CREDIT' ? 'bg-orange-100 text-orange-700' :
            shop?.type === 'WHOLESALE' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>{shop?.type}</span>
          {parseFloat(shop?.balance) > 0 && (
            <span className="text-orange-600 font-medium">Balance: {formatCurrency(shop.balance)}</span>
          )}
        </div>

        {/* Item toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-3 flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium"
        >
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {expanded ? 'Hide items' : `Show ${order?.items?.length} items`}
        </button>

        {expanded && (
          <div className="mt-3 bg-white rounded-xl p-3 border border-gray-100 space-y-2">
            {order?.items?.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-gray-700">{item.product?.name} <span className="text-gray-400">× {item.quantity} {item.product?.unit}</span></span>
                <span className="font-semibold text-gray-900">{formatCurrency(item.subtotal)}</span>
              </div>
            ))}
            <div className="flex justify-between text-sm border-t border-gray-100 pt-2 mt-2">
              <span className="font-bold text-gray-900">Total</span>
              <span className="font-bold text-indigo-600">{formatCurrency(order?.totalAmount)}</span>
            </div>
          </div>
        )}

        {/* Action button */}
        {status !== 'DELIVERED' && status !== 'FAILED' && (
          <div className="mt-4">
            <button
              onClick={() => onMarkDelivered(delivery.id)}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {loading ? 'Updating...' : 'Mark as Delivered'}
            </button>
          </div>
        )}

        {status === 'DELIVERED' && delivery.deliveredAt && (
          <p className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" />
            Delivered at {new Date(delivery.deliveredAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}

export default function DeliveryPage() {
  const qc = useQueryClient()
  const [view, setView] = useState('list') // 'list' | 'map'
  const [manifestOpen, setManifestOpen] = useState(false)

  const { data: orders = [], isLoading, refetch } = useQuery({
    queryKey: ['today-orders-delivery'],
    queryFn: () => orderApi.getToday().then(r => r.data),
    refetchInterval: 30000,
  })

  const { data: deliveries = [], isLoading: deliveriesLoading } = useQuery({
    queryKey: ['deliveries-today'],
    queryFn: () => deliveryApi.getAll().then(r => r.data),
    refetchInterval: 30000,
  })

  const markDeliveredM = useMutation({
    mutationFn: (id) => deliveryApi.updateStatus(id, { status: 'DELIVERED' }),
    onSuccess: () => {
      toast.success('Delivery marked complete! ✓')
      qc.invalidateQueries(['deliveries-today'])
      qc.invalidateQueries(['today-orders-delivery'])
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  // Also allow marking order as delivered directly if no delivery record
  const orderStatusM = useMutation({
    mutationFn: (id) => orderApi.updateStatus(id, { status: 'DELIVERED' }),
    onSuccess: () => {
      toast.success('Order marked delivered!')
      qc.invalidateQueries(['today-orders-delivery'])
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  // Build loading manifest: aggregate all items across orders
  const manifest = {}
  orders.forEach(order => {
    order.items?.forEach(item => {
      const key = item.productId
      if (!manifest[key]) {
        manifest[key] = { name: item.product?.name, unit: item.product?.unit, totalQty: 0, totalValue: 0 }
      }
      manifest[key].totalQty += item.quantity
      manifest[key].totalValue += Number(item.subtotal)
    })
  })
  const manifestItems = Object.values(manifest)

  const todayDate = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const totalOrders = orders.length
  const deliveredCount = orders.filter(o => o.status === 'DELIVERED').length
  const totalValue = orders.reduce((s, o) => s + Number(o.totalAmount), 0)

  if (isLoading || deliveriesLoading) return <LoadingSpinner text="Loading deliveries..." />

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4 flex-shrink-0">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Delivery Dashboard</h1>
            <p className="text-sm text-gray-400 mt-0.5">{todayDate}</p>
          </div>

          <div className="flex items-center gap-4">
            {/* Stats */}
            <div className="flex items-center gap-5 text-sm">
              <div className="text-center">
                <div className="font-bold text-emerald-600">{deliveredCount}/{totalOrders}</div>
                <div className="text-xs text-gray-400">Delivered</div>
              </div>
              <div className="text-center">
                <div className="font-bold text-indigo-600">{formatCurrency(totalValue)}</div>
                <div className="text-xs text-gray-400">Total Value</div>
              </div>
            </div>

            {/* Loading manifest button */}
            <button
              onClick={() => setManifestOpen(true)}
              className="btn-secondary flex items-center gap-2 text-sm"
            >
              <Package className="w-4 h-4" />
              Loading Manifest
            </button>

            {/* View toggle */}
            <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
              <button onClick={() => setView('list')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${view === 'list' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                <List className="w-3.5 h-3.5" /> List
              </button>
              <button onClick={() => setView('map')} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${view === 'map' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                <Map className="w-3.5 h-3.5" /> Map
              </button>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: totalOrders > 0 ? `${(deliveredCount / totalOrders) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* No orders */}
      {orders.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center">
            <Truck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-gray-900 mb-1">No Deliveries Today</h2>
            <p className="text-gray-500 text-sm">No confirmed orders assigned for today.</p>
          </div>
        </div>
      )}

      {/* List view */}
      {view === 'list' && orders.length > 0 && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {orders.map(order => {
            const delivery = deliveries.find(d => d.orderId === order.id)
            if (delivery) {
              return (
                <DeliveryCard
                  key={delivery.id}
                  delivery={{ ...delivery, order }}
                  onMarkDelivered={markDeliveredM.mutate}
                  loading={markDeliveredM.isPending}
                />
              )
            }
            // Fallback: direct order mark (if no delivery record yet)
            return (
              <div key={order.id} className="rounded-2xl border-2 border-gray-200 bg-white p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{order.shop?.name}</h3>
                    <p className="text-sm text-gray-500">{order.shop?.ownerName} · {order.shop?.phone}</p>
                    <p className="text-xs text-gray-400 mt-1">{order.shop?.address}</p>
                    <span className="inline-block mt-2 font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{order.orderNo}</span>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-gray-900">{formatCurrency(order.totalAmount)}</p>
                    <p className="text-xs text-gray-400">{order.items?.length} items</p>
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${order.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{order.status}</span>
                  </div>
                </div>
                <button
                  onClick={() => orderStatusM.mutate(order.id)}
                  disabled={orderStatusM.isPending}
                  className="mt-4 w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Delivered
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Map view */}
      {view === 'map' && orders.length > 0 && (
        <div className="flex-1 p-4">
          <DeliveryMap
            deliveries={deliveries.length > 0 ? deliveries.map(d => ({ ...d, order: orders.find(o => o.id === d.orderId) || d.order })) : orders.map(o => ({ id: o.id, status: o.status, orderId: o.id, order: o }))}
          />
        </div>
      )}

      {/* Loading Manifest Modal */}
      <Modal open={manifestOpen} onClose={() => setManifestOpen(false)} title="Loading Manifest — Today" size="md">
        <div className="space-y-4">
          <div className="bg-indigo-50 rounded-xl p-4">
            <p className="text-sm text-indigo-700 font-semibold">
              Load this stock on your vehicle before starting deliveries:
            </p>
            <div className="flex gap-4 mt-2 text-sm text-indigo-600">
              <span>{totalOrders} orders</span>
              <span>·</span>
              <span>{formatCurrency(totalValue)} total value</span>
            </div>
          </div>

          <div className="space-y-2">
            {manifestItems.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">No items to load</p>
            ) : manifestItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <Package className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{item.name}</p>
                    <p className="text-xs text-gray-400">Unit: {item.unit}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 text-lg">{item.totalQty}</p>
                  <p className="text-xs text-gray-400">{item.unit}s</p>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 flex justify-between text-sm font-semibold text-gray-900">
            <span>Total Load Value</span>
            <span className="text-indigo-600">{formatCurrency(totalValue)}</span>
          </div>
        </div>
      </Modal>
    </div>
  )
}

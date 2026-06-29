'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { shopPortalDataApi } from '@/lib/shopPortalApi'
import { formatCurrency, formatDate, formatDateTime, getErrorMessage, downloadBlob } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Wallet, CreditCard, Download, Package, BookOpen, ShoppingBag } from 'lucide-react'

const TABS = [
  { key: 'overview', label: 'Overview', icon: Wallet },
  { key: 'ledger', label: 'Ledger', icon: BookOpen },
  { key: 'orders', label: 'Orders', icon: ShoppingBag },
]

export default function ShopPortalDashboard() {
  const [tab, setTab] = useState('overview')

  const { data: me, isLoading: meLoading } = useQuery({ queryKey: ['shop-portal-me'], queryFn: () => shopPortalDataApi.getMe().then(r => r.data) })
  const { data: ordersData, isLoading: ordersLoading } = useQuery({
    queryKey: ['shop-portal-orders'],
    queryFn: () => shopPortalDataApi.getOrders({ limit: 20 }).then(r => r.data),
    enabled: tab === 'overview' || tab === 'orders',
  })
  const { data: ledgerData, isLoading: ledgerLoading } = useQuery({
    queryKey: ['shop-portal-ledger'],
    queryFn: () => shopPortalDataApi.getLedger().then(r => r.data),
    enabled: tab === 'ledger',
  })

  const pdfM = useMutation({
    mutationFn: (order) => shopPortalDataApi.downloadInvoicePdf(order.id),
    onSuccess: (res, order) => downloadBlob(res.data, `${order.invoice?.invoiceNo || order.orderNo}.pdf`),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (meLoading) return <LoadingSpinner />

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><Wallet className="w-3.5 h-3.5" />Balance Due</div>
          <p className={`text-2xl font-bold ${Number(me?.balance) > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>{formatCurrency(me?.balance)}</p>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-gray-500 text-xs mb-1"><CreditCard className="w-3.5 h-3.5" />Credit Limit</div>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(me?.creditLimit)}</p>
        </div>
      </div>

      <div className="flex bg-gray-100 rounded-xl p-1">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === key ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>
            <Icon className="w-4 h-4" />{label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">Recent Orders</h3>
          {ordersLoading ? <LoadingSpinner /> : (
            <div className="space-y-2">
              {ordersData?.orders.slice(0, 5).map((o) => <OrderRow key={o.id} order={o} onDownload={pdfM.mutate} downloading={pdfM.isPending && pdfM.variables?.id === o.id} />)}
              {ordersData?.orders.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>}
            </div>
          )}
        </div>
      )}

      {tab === 'ledger' && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 text-sm">Account Ledger</h3>
            {ledgerData && !ledgerData.shop.tracksBalance && (
              <span className="text-xs text-gray-400">Balance not tracked for {ledgerData.shop.type} shops</span>
            )}
          </div>
          {ledgerLoading ? <LoadingSpinner /> : ledgerData?.entries.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No ledger activity yet</p>
          ) : (
            <div className="overflow-x-auto -mx-4">
              <table className="w-full text-sm min-w-[480px]">
                <thead className="text-xs text-gray-400 uppercase">
                  <tr><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Description</th><th className="text-right px-4 py-2">Debit</th><th className="text-right px-4 py-2">Credit</th><th className="text-right px-4 py-2">Balance</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledgerData?.entries.map((e, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="px-4 py-2 text-gray-700">{e.description}</td>
                      <td className="px-4 py-2 text-right text-red-600">{e.debit > 0 ? formatCurrency(e.debit) : '—'}</td>
                      <td className="px-4 py-2 text-right text-emerald-600">{e.credit > 0 ? formatCurrency(e.credit) : '—'}</td>
                      <td className="px-4 py-2 text-right font-semibold text-gray-900">{formatCurrency(e.runningBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'orders' && (
        <div className="card p-4">
          <h3 className="font-semibold text-gray-900 mb-3 text-sm">All Orders</h3>
          {ordersLoading ? <LoadingSpinner /> : (
            <div className="space-y-2">
              {ordersData?.orders.map((o) => <OrderRow key={o.id} order={o} onDownload={pdfM.mutate} downloading={pdfM.isPending && pdfM.variables?.id === o.id} expanded />)}
              {ordersData?.orders.length === 0 && <p className="text-gray-400 text-sm text-center py-6">No orders yet</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function OrderRow({ order, onDownload, downloading, expanded }) {
  return (
    <div className="border border-gray-100 rounded-xl p-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-gray-900 text-sm flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-gray-400" />{order.orderNo}</p>
          <p className="text-xs text-gray-400 mt-0.5">{formatDate(order.orderDate)}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900 text-sm">{formatCurrency(order.totalAmount)}</p>
          <span className={`inline-block mt-0.5 text-xs px-2 py-0.5 rounded-full font-medium ${
            order.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-700' :
            order.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
            order.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
          }`}>{order.status}</span>
        </div>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-gray-50 space-y-1">
          {order.items.map((item) => (
            <div key={item.id} className="flex justify-between text-xs text-gray-500">
              <span>{item.product?.name} × {item.quantity}</span>
              <span>{formatCurrency(item.subtotal)}</span>
            </div>
          ))}
        </div>
      )}
      {order.invoice && (
        <button onClick={() => onDownload(order)} disabled={downloading} className="mt-2 flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 disabled:opacity-50">
          <Download className="w-3.5 h-3.5" />{downloading ? 'Preparing…' : 'Download Invoice'}
        </button>
      )}
    </div>
  )
}

'use client'
import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { shopPortalDataApi } from '@/lib/shopPortalApi'
import { formatCurrency, downloadBlob, getErrorMessage } from '@/lib/utils'
import {
  LayoutDashboard, FileText, CreditCard, LogOut,
  TrendingUp, TrendingDown, Wallet, Package,
  Download, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownLeft,
  AlertTriangle, CheckCircle, Clock, Truck, XCircle,
} from 'lucide-react'

const fmt = (n) => formatCurrency(n || 0)
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-PK', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const ORDER_STATUS_CONFIG = {
  PENDING:    { label: 'Pending',    icon: Clock,       bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
  CONFIRMED:  { label: 'Confirmed',  icon: CheckCircle, bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200'   },
  DISPATCHED: { label: 'Dispatched', icon: Truck,       bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200' },
  DELIVERED:  { label: 'Delivered',  icon: CheckCircle, bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200'  },
  CANCELLED:  { label: 'Cancelled',  icon: XCircle,     bg: 'bg-red-50',    text: 'text-red-700',    border: 'border-red-200'    },
}

const PAYMENT_TYPE_CONFIG = {
  CASH:          { label: 'Cash',          bg: 'bg-emerald-100', text: 'text-emerald-700' },
  CHEQUE:        { label: 'Cheque',        bg: 'bg-blue-100',    text: 'text-blue-700'    },
  BANK_TRANSFER: { label: 'Bank Transfer', bg: 'bg-purple-100',  text: 'text-purple-700'  },
  CREDIT:        { label: 'Credit',        bg: 'bg-orange-100',  text: 'text-orange-700'  },
}

function logout() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('fm_shop_token')
    localStorage.removeItem('fm_shop_data')
    window.location.href = '/shop-portal/login'
  }
}

// ─── Summary Cards ────────────────────────────────────────────────────────────
function SummaryCards({ shop, summary }) {
  const balance = Number(shop?.balance || 0)
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <div className={`rounded-2xl p-4 border ${balance > 0 ? 'bg-orange-50 border-orange-200' : 'bg-green-50 border-green-200'}`}>
        <div className={`flex items-center gap-2 mb-1 ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
          <Wallet className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">Current Balance</span>
        </div>
        <p className={`text-2xl font-bold ${balance > 0 ? 'text-orange-700' : 'text-green-700'}`}>{fmt(balance)}</p>
        <p className="text-xs text-gray-400 mt-0.5">{balance > 0 ? 'Outstanding' : 'Clear'}</p>
      </div>

      <div className="rounded-2xl p-4 bg-white border border-gray-100">
        <div className="flex items-center gap-2 mb-1 text-gray-500">
          <Package className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">Total Orders</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{summary?.totalOrders ?? '—'}</p>
        <p className="text-xs text-gray-400 mt-0.5">{summary?.deliveredOrders ?? 0} delivered</p>
      </div>

      <div className="rounded-2xl p-4 bg-white border border-gray-100">
        <div className="flex items-center gap-2 mb-1 text-gray-500">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">Total Billed</span>
        </div>
        <p className="text-2xl font-bold text-gray-900">{fmt(summary?.totalBilled)}</p>
        <p className="text-xs text-gray-400 mt-0.5">delivered orders</p>
      </div>

      <div className="rounded-2xl p-4 bg-emerald-50 border border-emerald-200">
        <div className="flex items-center gap-2 mb-1 text-emerald-600">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase">Total Paid</span>
        </div>
        <p className="text-2xl font-bold text-emerald-700">{fmt(summary?.totalPaid)}</p>
        <p className="text-xs text-gray-400 mt-0.5">all payments</p>
      </div>
    </div>
  )
}

// ─── Ledger Tab ───────────────────────────────────────────────────────────────
function LedgerTab() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['portal-ledger'],
    queryFn: () => shopPortalDataApi.getLedger().then(r => r.data),
  })

  const billM = useMutation({
    mutationFn: (orderId) => shopPortalDataApi.downloadBill(orderId),
    onSuccess: (res, orderId) => downloadBlob(res.data, `bill-${orderId}.pdf`),
    onError: e => toast.error(getErrorMessage(e)),
  })

  const invoiceM = useMutation({
    mutationFn: (orderId) => shopPortalDataApi.downloadInvoicePdf(orderId),
    onSuccess: (res, orderId) => downloadBlob(res.data, `invoice-${orderId}.pdf`),
    onError: e => toast.error(getErrorMessage(e)),
  })

  if (isLoading) return <div className="text-center py-16 text-gray-400">Loading ledger...</div>
  if (isError)  return <div className="text-center py-16 text-red-400">Could not load ledger</div>

  const { shop, summary, entries } = data || {}
  const balance = Number(shop?.balance || 0)

  return (
    <div className="space-y-5">
      <SummaryCards shop={shop} summary={summary} />

      {/* Credit limit bar — only for CREDIT shops */}
      {shop?.creditLimit > 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700">Credit Limit Usage</span>
            <span className="text-gray-500">{fmt(balance)} / {fmt(shop.creditLimit)}</span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${balance / shop.creditLimit > 0.8 ? 'bg-red-500' : balance / shop.creditLimit > 0.5 ? 'bg-orange-400' : 'bg-emerald-500'}`}
              style={{ width: `${Math.min(100, (balance / shop.creditLimit) * 100)}%` }}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1.5">{fmt(Math.max(0, shop.creditLimit - balance))} remaining credit available</p>
        </div>
      )}

      {/* Ledger Table */}
      <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Account Ledger</h3>
          <span className="text-xs text-gray-400">{entries?.length ?? 0} entries</span>
        </div>

        {!entries?.length ? (
          <div className="text-center py-12 text-gray-400">Koi transactions nahi mili</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Date & Time</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase">Description</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Debit (Udhar)</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Credit (Payment)</th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase text-right">Balance</th>
                  <th className="px-4 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...entries].reverse().map((entry, idx) => {
                  const isDebit   = entry.type === 'ORDER_DEBIT'
                  const isPayment = entry.type === 'PAYMENT'
                  const isInfo    = entry.type === 'ORDER_INFO'

                  const rowBg = isDebit   ? 'bg-red-50/40 hover:bg-red-50'
                              : isPayment ? 'bg-emerald-50/40 hover:bg-emerald-50'
                              : 'hover:bg-gray-50'

                  const statusCfg = entry.orderStatus ? ORDER_STATUS_CONFIG[entry.orderStatus] : null
                  const StatusIcon = statusCfg?.icon

                  return (
                    <tr key={entry.orderId || entry.paymentId || idx} className={`${rowBg} transition-colors`}>
                      {/* Date */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap align-top">
                        <div className="font-medium text-gray-700">{fmtDate(entry.date)}</div>
                        <div className="text-gray-400 mt-0.5">
                          {new Date(entry.date).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>

                      {/* Description */}
                      <td className="px-4 py-3 align-top max-w-xs">
                        <div className="flex items-start gap-2">
                          {isDebit   && <ArrowUpRight   className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />}
                          {isPayment && <ArrowDownLeft  className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />}
                          {isInfo    && <Package        className="w-4 h-4 text-gray-300 mt-0.5 flex-shrink-0" />}
                          <div className="min-w-0">
                            <p className={`font-medium leading-snug ${isInfo ? 'text-gray-400' : 'text-gray-800'}`}>
                              {entry.description}
                            </p>

                            {/* Order items summary */}
                            {entry.itemsSummary && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{entry.itemsSummary}</p>
                            )}

                            {/* Status badge for orders */}
                            {statusCfg && (
                              <span className={`inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                                {StatusIcon && <StatusIcon className="w-2.5 h-2.5" />}
                                {statusCfg.label}
                              </span>
                            )}

                            {/* Payment type badge */}
                            {entry.paymentType && PAYMENT_TYPE_CONFIG[entry.paymentType] && (
                              <span className={`inline-flex mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${PAYMENT_TYPE_CONFIG[entry.paymentType].bg} ${PAYMENT_TYPE_CONFIG[entry.paymentType].text}`}>
                                {PAYMENT_TYPE_CONFIG[entry.paymentType].label}
                              </span>
                            )}
                            {entry.reference && (
                              <p className="text-xs text-gray-400 mt-0.5">Ref: {entry.reference}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Debit */}
                      <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                        {entry.debit > 0 ? (
                          <span className="font-semibold text-red-600">{fmt(entry.debit)}</span>
                        ) : <span className="text-gray-200">—</span>}
                      </td>

                      {/* Credit */}
                      <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                        {entry.credit > 0 ? (
                          <span className="font-semibold text-emerald-600">{fmt(entry.credit)}</span>
                        ) : <span className="text-gray-200">—</span>}
                      </td>

                      {/* Running balance */}
                      <td className="px-4 py-3 text-right align-top whitespace-nowrap">
                        {(isDebit || isPayment) ? (
                          <span className={`font-bold text-sm ${entry.runningBalance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                            {fmt(entry.runningBalance)}
                          </span>
                        ) : <span className="text-gray-200">—</span>}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 align-top">
                        {entry.orderId && (
                          <div className="flex gap-1.5 justify-end">
                            <button
                              onClick={() => billM.mutate(entry.orderId)}
                              disabled={billM.isPending && billM.variables === entry.orderId}
                              title="Download Bill"
                              className="p-1.5 text-gray-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Footer: current balance row */}
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={4} className="px-4 py-3 font-semibold text-gray-700 text-right">Current Outstanding Balance</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`text-base font-bold ${balance > 0 ? 'text-orange-600' : 'text-emerald-600'}`}>
                      {fmt(balance)}
                    </span>
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 text-xs text-gray-400 px-1">
        <span className="flex items-center gap-1.5"><ArrowUpRight className="w-3.5 h-3.5 text-red-400" /> Debit (maal aaya, udhar pada)</span>
        <span className="flex items-center gap-1.5"><ArrowDownLeft className="w-3.5 h-3.5 text-emerald-500" /> Credit (payment di)</span>
        <span className="flex items-center gap-1.5"><Package className="w-3.5 h-3.5 text-gray-300" /> Order history (balance affect nahi)</span>
      </div>
    </div>
  )
}

// ─── Orders Tab ───────────────────────────────────────────────────────────────
function OrdersTab() {
  const [expanded, setExpanded] = useState(null)
  const { data, isLoading } = useQuery({
    queryKey: ['portal-orders'],
    queryFn: () => shopPortalDataApi.getOrders().then(r => r.data),
  })

  const billM = useMutation({
    mutationFn: (orderId) => shopPortalDataApi.downloadBill(orderId),
    onSuccess: (res, orderId) => downloadBlob(res.data, `bill-${orderId}.pdf`),
    onError: e => toast.error(getErrorMessage(e)),
  })
  const invoiceM = useMutation({
    mutationFn: (orderId) => shopPortalDataApi.downloadInvoicePdf(orderId),
    onSuccess: (res, orderId) => downloadBlob(res.data, `invoice-${orderId}.pdf`),
    onError: e => toast.error(getErrorMessage(e)),
  })

  if (isLoading) return <div className="text-center py-16 text-gray-400">Loading orders...</div>
  const orders = data?.orders || []

  return (
    <div className="space-y-3">
      {orders.length === 0 && <div className="text-center py-16 text-gray-400">Koi orders nahi</div>}
      {orders.map(o => {
        const cfg = ORDER_STATUS_CONFIG[o.status] || ORDER_STATUS_CONFIG.PENDING
        const Icon = cfg.icon
        const isOpen = expanded === o.id
        return (
          <div key={o.id} className={`bg-white border rounded-2xl overflow-hidden transition-all ${cfg.border}`}>
            <button
              className="w-full text-left px-4 py-4 flex items-center gap-3"
              onClick={() => setExpanded(isOpen ? null : o.id)}
            >
              <span className={`p-2 rounded-xl ${cfg.bg}`}><Icon className={`w-4 h-4 ${cfg.text}`} /></span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-gray-900">{o.orderNo}</p>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium border ${cfg.bg} ${cfg.text} ${cfg.border}`}>{cfg.label}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{fmtDate(o.orderDate)} · {o.items?.length ?? 0} items</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900">{fmt(o.totalAmount)}</p>
                {Number(o.paidAmount) > 0 && <p className="text-xs text-emerald-600">Paid: {fmt(o.paidAmount)}</p>}
              </div>
              {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </button>

            {isOpen && (
              <div className="border-t border-gray-100 px-4 pb-4">
                <div className="mt-3 space-y-2">
                  <div className="flex text-[11px] text-gray-400 font-semibold pb-1 border-b border-gray-100">
                    <span className="flex-1">Product</span>
                    <span className="w-16 text-right">Rate</span>
                    <span className="w-12 text-right">Qty</span>
                    <span className="w-20 text-right">Amount</span>
                  </div>
                  {o.items?.map((item, i) => (
                    <div key={i} className="flex text-sm text-gray-700">
                      <span className="flex-1 font-medium">{item.product?.name}</span>
                      <span className="w-16 text-right text-gray-400">{fmt(item.price)}</span>
                      <span className="w-12 text-right text-gray-500">×{item.quantity}</span>
                      <span className="w-20 text-right font-semibold">{fmt(item.subtotal)}</span>
                    </div>
                  ))}
                  <div className="flex justify-end pt-2 border-t border-gray-100">
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">Total: {fmt(o.totalAmount)}</p>
                      {Number(o.paidAmount) > 0 && <p className="text-xs text-emerald-600">Paid: {fmt(o.paidAmount)}</p>}
                    </div>
                  </div>
                  {o.notes && <p className="text-xs text-gray-400 italic mt-1">{o.notes}</p>}
                </div>
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => billM.mutate(o.id)}
                    disabled={billM.isPending && billM.variables === o.id}
                    className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" /> Bill
                  </button>
                  {o.invoice && (
                    <button
                      onClick={() => invoiceM.mutate(o.id)}
                      disabled={invoiceM.isPending && invoiceM.variables === o.id}
                      className="flex items-center gap-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      <FileText className="w-3.5 h-3.5" /> Invoice
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Payments Tab ─────────────────────────────────────────────────────────────
function PaymentsTab() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal-payments'],
    queryFn: () => shopPortalDataApi.getPayments().then(r => r.data),
  })
  if (isLoading) return <div className="text-center py-16 text-gray-400">Loading payments...</div>
  const payments = data?.payments || []

  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">Koi payments nahi</div>
      ) : (
        <div className="table-scroll">
        <table className="w-full text-sm min-w-[480px]">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Date</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Reference</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-gray-400 uppercase">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {payments.map(p => {
              const cfg = PAYMENT_TYPE_CONFIG[p.type] || {}
              return (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{fmtDate(p.receivedAt)}</div>
                    <div className="text-xs text-gray-400">{new Date(p.receivedAt).toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' })}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.text}`}>{cfg.label || p.type}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{p.reference || '—'}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">{fmt(p.amount)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-gray-50 border-t-2 border-gray-200">
              <td colSpan={3} className="px-4 py-3 font-semibold text-gray-700 text-right">Total Paid</td>
              <td className="px-4 py-3 text-right font-bold text-emerald-600">
                {fmt(payments.reduce((s, p) => s + Number(p.amount), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
        </div>
      )}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ShopPortalPage() {
  const [tab, setTab] = useState('ledger')

  const { data: meData } = useQuery({
    queryKey: ['portal-me'],
    queryFn: () => shopPortalDataApi.getMe().then(r => r.data),
  })

  const shop = meData?.shop
  const balance = Number(shop?.balance || 0)

  const TABS = [
    { id: 'ledger',   label: 'Ledger',   icon: CreditCard },
    { id: 'orders',   label: 'Orders',   icon: Package },
    { id: 'payments', label: 'Payments', icon: Wallet },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-bold text-gray-900">{shop?.name || 'Shop Portal'}</h1>
            <p className="text-xs text-gray-400">{shop?.ownerName} · {shop?.type}</p>
          </div>
          {balance > 0 && (
            <div className="hidden sm:flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-orange-500" />
              <span className="text-sm font-semibold text-orange-700">{fmt(balance)} outstanding</span>
            </div>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Logout
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-4xl mx-auto px-4 flex gap-1 pb-0">
          {TABS.map(t => {
            const Icon = t.icon
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-gray-400 hover:text-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />{t.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {tab === 'ledger'   && <LedgerTab />}
        {tab === 'orders'   && <OrdersTab />}
        {tab === 'payments' && <PaymentsTab />}
      </div>
    </div>
  )
}

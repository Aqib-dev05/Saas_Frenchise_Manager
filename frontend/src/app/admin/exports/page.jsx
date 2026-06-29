'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { exportApi } from '@/lib/api'
import { getErrorMessage, downloadBlob } from '@/lib/utils'
import {
  Package, Users, Store, AlertTriangle, Wallet, ShoppingCart,
  CalendarDays, CalendarRange, PieChart, Download, FileSpreadsheet,
} from 'lucide-react'

// Each report optionally takes a small set of filter inputs (date range, a
// status dropdown, or a day/month count) — declared once here so the card
// renderer below can stay generic instead of one bespoke block per report.
const REPORTS = [
  { type: 'products', label: 'Products', icon: Package, desc: 'Full catalog with price, cost, margin %, stock & low-stock flag.' },
  { type: 'users', label: 'Team / Users', icon: Users, desc: 'Admins, salesmen & delivery staff — no passwords included.' },
  { type: 'shops', label: 'Shops', icon: Store, desc: 'All shops with balance, credit limit, type & status.' },
  { type: 'credit-report', label: 'Credit Report', icon: AlertTriangle, desc: 'Shops currently carrying an outstanding balance.' },
  { type: 'payments', label: 'Payments', icon: Wallet, desc: 'Payment ledger — optionally filtered by date range.', filters: ['dateRange'] },
  { type: 'orders', label: 'Orders', icon: ShoppingCart, desc: 'Order list with status & paid/total — filter by date or status.', filters: ['dateRange', 'status'] },
  { type: 'daily-sales', label: 'Daily Sales', icon: CalendarDays, desc: 'Revenue & orders per day.', filters: ['days'] },
  { type: 'monthly-sales', label: 'Monthly Sales', icon: CalendarRange, desc: 'Revenue & orders per month.', filters: ['months'] },
  { type: 'product-sales-ratio', label: 'Product Sales Ratio', icon: PieChart, desc: 'Each product\u2019s share of total quantity & revenue sold.', filters: ['dateRange'] },
]

const ORDER_STATUSES = ['PENDING', 'CONFIRMED', 'DISPATCHED', 'DELIVERED', 'CANCELLED']

export default function ExportsPage() {
  const [filters, setFilters] = useState({}) // { [type]: { format, from, to, days, months, status } }

  const setFilter = (type, patch) => setFilters((f) => ({ ...f, [type]: { ...f[type], ...patch } }))
  const getFilter = (type) => filters[type] || { format: 'xlsx' }

  const downloadM = useMutation({
    mutationFn: ({ type, params }) => exportApi.download(type, params),
    onSuccess: (res, { type, params }) => {
      const ext = params.format === 'csv' ? 'csv' : 'xlsx'
      downloadBlob(res.data, `${type}.${ext}`)
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const handleDownload = (type) => {
    const f = getFilter(type)
    const params = { format: f.format || 'xlsx' }
    if (f.from) params.from = f.from
    if (f.to) params.to = f.to
    if (f.days) params.days = f.days
    if (f.months) params.months = f.months
    if (f.status) params.status = f.status
    downloadM.mutate({ type, params })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports &amp; Exports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Download data as Excel (.xlsx) or CSV. Admin only.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {REPORTS.map((report) => {
          const f = getFilter(report.type)
          const isDownloading = downloadM.isPending && downloadM.variables?.type === report.type
          const Icon = report.icon
          return (
            <div key={report.type} className="card p-5 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-5 h-5 text-indigo-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900">{report.label}</h3>
                  <p className="text-xs text-gray-500 mt-0.5">{report.desc}</p>
                </div>
              </div>

              {report.filters?.includes('dateRange') && (
                <div className="flex items-center gap-2 text-xs">
                  <input type="date" value={f.from || ''} onChange={(e) => setFilter(report.type, { from: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 flex-1" />
                  <span className="text-gray-400">to</span>
                  <input type="date" value={f.to || ''} onChange={(e) => setFilter(report.type, { to: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 flex-1" />
                </div>
              )}

              {report.filters?.includes('status') && (
                <select value={f.status || ''} onChange={(e) => setFilter(report.type, { status: e.target.value })}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs">
                  <option value="">All statuses</option>
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              )}

              {report.filters?.includes('days') && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Last</span>
                  <input type="number" min={1} max={365} value={f.days || 30}
                    onChange={(e) => setFilter(report.type, { days: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-20" />
                  <span className="text-gray-500">days</span>
                </div>
              )}

              {report.filters?.includes('months') && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-gray-500">Last</span>
                  <input type="number" min={1} max={60} value={f.months || 12}
                    onChange={(e) => setFilter(report.type, { months: e.target.value })}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 w-20" />
                  <span className="text-gray-500">months</span>
                </div>
              )}

              <div className="flex items-center justify-between mt-auto pt-1">
                <div className="flex bg-gray-100 rounded-lg p-0.5 text-xs">
                  {['xlsx', 'csv'].map((fmt) => (
                    <button key={fmt} onClick={() => setFilter(report.type, { format: fmt })}
                      className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                        (f.format || 'xlsx') === fmt ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'
                      }`}>
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <button onClick={() => handleDownload(report.type)} disabled={isDownloading} className="btn-primary text-sm flex items-center gap-1.5 py-1.5 px-3.5">
                  {isDownloading ? <FileSpreadsheet className="w-4 h-4 animate-pulse" /> : <Download className="w-4 h-4" />}
                  {isDownloading ? 'Preparing…' : 'Download'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

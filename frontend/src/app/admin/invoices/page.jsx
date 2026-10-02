'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { orderApi, invoiceApi } from '@/lib/api'
import { formatCurrency, formatDate, formatDateTime, getErrorMessage, downloadBlob } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { Download, Trash2, FileCheck2 } from 'lucide-react'

export default function InvoicesPage() {
  const qc = useQueryClient()
  const [confirmClear, setConfirmClear] = useState(false)
  const { data, isLoading } = useQuery({ queryKey: ['orders-invoices'], queryFn: () => orderApi.getAll({ limit: 200 }).then(r => r.data) })
  const orders = (data?.orders || []).filter(o => o.invoice)

  const totalInvoiced = orders.reduce((s, o) => s + Number(o.invoice?.amount || 0), 0)
  const totalPaid = orders.reduce((s, o) => s + Number(o.invoice?.paid || 0), 0)
  const totalDue = totalInvoiced - totalPaid

  const pdfM = useMutation({
    mutationFn: (orderId) => invoiceApi.downloadPdf(orderId),
    onSuccess: (res, orderId) => {
      const order = orders.find(o => o.id === orderId)
      downloadBlob(res.data, `${order?.invoice?.invoiceNo || 'invoice'}.pdf`)
      qc.invalidateQueries(['orders-invoices']) // refresh cached-PDF status
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const clearM = useMutation({
    mutationFn: () => invoiceApi.clearHistory(),
    onSuccess: (res) => {
      toast.success(`Cleared ${res.data.cleared} cached PDF${res.data.cleared === 1 ? '' : 's'}`)
      setConfirmClear(false)
      qc.invalidateQueries(['orders-invoices'])
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
        <button
          onClick={() => setConfirmClear(true)}
          disabled={!orders.some(o => o.invoice?.pdfGeneratedAt)}
          className="flex items-center gap-1.5 text-sm text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Trash2 className="w-4 h-4" />Clear PDF History
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-sm text-gray-500">Total Invoiced</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalInvoiced)}</p></div>
        <div className="card p-5"><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p></div>
        <div className="card p-5"><p className="text-sm text-gray-500">Outstanding</p><p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalDue)}</p></div>
      </div>
      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
        <div className="table-scroll">
          <table className="w-full text-sm min-w-[920px]">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-4 py-3">Invoice No</th>
              <th className="text-left px-4 py-3">Order No</th>
              <th className="text-left px-4 py-3">Shop</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-right px-4 py-3">Paid</th>
              <th className="text-right px-4 py-3">Due</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Due Date</th>
              <th className="text-left px-4 py-3">PDF</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {orders.map(o => {
                const inv = o.invoice
                const due = Number(inv.amount) - Number(inv.paid)
                return (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{inv.invoiceNo}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.orderNo}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{o.shop?.name}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{formatCurrency(inv.paid)}</td>
                    <td className="px-4 py-3 text-right text-orange-600 font-semibold">{formatCurrency(due)}</td>
                    <td className="px-4 py-3">{inv.isPaid ? <span className="badge-green">Paid</span> : due > 0 ? <span className="badge-yellow">Partial</span> : <span className="badge-red">Unpaid</span>}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{inv.dueDate ? formatDate(inv.dueDate) : '—'}</td>
                    <td className="px-4 py-3">
                      {inv.pdfGeneratedAt ? (
                        <span title={`Generated ${formatDateTime(inv.pdfGeneratedAt)}`} className="flex items-center gap-1 text-xs text-emerald-600">
                          <FileCheck2 className="w-3.5 h-3.5" />Cached
                        </span>
                      ) : <span className="text-xs text-gray-400">Not generated</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => pdfM.mutate(o.id)}
                        disabled={pdfM.isPending && pdfM.variables === o.id}
                        title="Download PDF"
                        className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                )
              })}
              {orders.length === 0 && <tr><td colSpan={10} className="text-center text-gray-400 py-12">No invoices yet</td></tr>}
            </tbody>
          </table>
        </div>
        </div>
      )}

      <Modal open={confirmClear} onClose={() => setConfirmClear(false)} title="Clear PDF History" size="sm">
        <p className="text-gray-600 mb-2">
          This deletes all cached invoice PDFs from Cloudinary for this organization. Invoice amounts,
          payments, and due/paid status are <strong>not affected</strong> — files simply regenerate
          automatically next time someone downloads them.
        </p>
        <div className="flex gap-3 mt-6">
          <button onClick={() => setConfirmClear(false)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => clearM.mutate()} disabled={clearM.isPending} className="btn-danger flex-1">
            {clearM.isPending ? 'Clearing…' : 'Clear History'}
          </button>
        </div>
      </Modal>
    </div>
  )
}

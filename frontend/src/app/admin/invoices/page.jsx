'use client'
import { useQuery } from '@tanstack/react-query'
import { orderApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function InvoicesPage() {
  const { data, isLoading } = useQuery({ queryKey: ['orders-invoices'], queryFn: () => orderApi.getAll({ limit: 200 }).then(r => r.data) })
  const orders = (data?.orders || []).filter(o => o.invoice)

  const totalInvoiced = orders.reduce((s, o) => s + Number(o.invoice?.amount || 0), 0)
  const totalPaid = orders.reduce((s, o) => s + Number(o.invoice?.paid || 0), 0)
  const totalDue = totalInvoiced - totalPaid

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-gray-900">Invoices</h1></div>
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-sm text-gray-500">Total Invoiced</p><p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(totalInvoiced)}</p></div>
        <div className="card p-5"><p className="text-sm text-gray-500">Total Collected</p><p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(totalPaid)}</p></div>
        <div className="card p-5"><p className="text-sm text-gray-500">Outstanding</p><p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(totalDue)}</p></div>
      </div>
      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-4 py-3">Invoice No</th>
              <th className="text-left px-4 py-3">Order No</th>
              <th className="text-left px-4 py-3">Shop</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-right px-4 py-3">Paid</th>
              <th className="text-right px-4 py-3">Due</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Due Date</th>
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
                  </tr>
                )
              })}
              {orders.length === 0 && <tr><td colSpan={8} className="text-center text-gray-400 py-12">No invoices yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

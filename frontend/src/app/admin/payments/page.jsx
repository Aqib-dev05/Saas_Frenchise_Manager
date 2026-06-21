'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { paymentApi, shopApi } from '@/lib/api'
import { formatCurrency, formatDateTime, getErrorMessage, PAYMENT_TYPES } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, CreditCard } from 'lucide-react'

export default function PaymentsPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(false)
  const { register, handleSubmit, reset, formState: { errors } } = useForm()

  const { data, isLoading } = useQuery({ queryKey: ['payments'], queryFn: () => paymentApi.getAll({ limit: 200 }).then(r => r.data) })
  const { data: shopsData } = useQuery({ queryKey: ['shops-all-for-payments'], queryFn: () => shopApi.getAll({ limit: 500 }).then(r => r.data) })

  const createM = useMutation({
    mutationFn: paymentApi.create,
    onSuccess: () => { toast.success('Payment recorded!'); qc.invalidateQueries(['payments']); qc.invalidateQueries(['shops']); setModal(false); reset() },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const payments = data?.payments || []
  const shops = shopsData?.shops || []
  const totalReceived = payments.reduce((s, p) => s + Number(p.amount), 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Payments</h1><p className="text-gray-500 text-sm">Total received: {formatCurrency(totalReceived)}</p></div>
        <button onClick={() => setModal(true)} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Record Payment</button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-4 py-3">Shop</th>
              <th className="text-left px-4 py-3">Owner</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Reference</th>
              <th className="text-right px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Date</th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {payments.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.shop?.name}</td>
                  <td className="px-4 py-3 text-gray-500">{p.shop?.ownerName}</td>
                  <td className="px-4 py-3"><span className="badge-blue">{p.type}</span></td>
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{p.reference || '—'}</td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{formatDateTime(p.receivedAt)}</td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-12">No payments recorded yet</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Record Payment" size="sm">
        <form onSubmit={handleSubmit(d => createM.mutate(d))} className="space-y-4">
          <div>
            <label className="label">Shop *</label>
            <select className="input" {...register('shopId', { required: true })}>
              <option value="">Select shop...</option>
              {shops.filter(s => Number(s.balance) > 0).map(s => (
                <option key={s.id} value={s.id}>{s.name} — {formatCurrency(s.balance)} due</option>
              ))}
              {shops.filter(s => Number(s.balance) <= 0).map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
            {errors.shopId && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="label">Amount (Rs.) *</label>
            <input className="input" type="number" step="1" min="1" {...register('amount', { required: true })} />
            {errors.amount && <p className="text-red-500 text-xs mt-1">Required</p>}
          </div>
          <div>
            <label className="label">Payment Type</label>
            <select className="input" {...register('type')}>
              {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_',' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Reference / Cheque No.</label>
            <input className="input" placeholder="Optional" {...register('reference')} />
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input resize-none" rows={2} {...register('notes')} />
          </div>
          <button type="submit" disabled={createM.isPending} className="btn-primary w-full">{createM.isPending ? 'Saving...' : 'Record Payment'}</button>
        </form>
      </Modal>
    </div>
  )
}

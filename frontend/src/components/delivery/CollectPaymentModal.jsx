'use client'
import { useForm } from 'react-hook-form'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { paymentApi } from '@/lib/api'
import { formatCurrency, getErrorMessage, PAYMENT_TYPES } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { Wallet } from 'lucide-react'

export default function CollectPaymentModal({ shop, open, onClose }) {
  const qc = useQueryClient()
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ defaultValues: { type: 'CASH' } })

  const createM = useMutation({
    mutationFn: paymentApi.create,
    onSuccess: () => {
      toast.success('Payment recorded! ✓')
      qc.invalidateQueries(['today-orders-delivery'])
      qc.invalidateQueries(['deliveries-today'])
      qc.invalidateQueries(['payments'])
      reset()
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  if (!shop) return null

  return (
    <Modal open={open} onClose={onClose} title="Collect Payment" size="sm">
      <div className="space-y-4">
        <div className="bg-slate-50 rounded-xl p-4">
          <p className="font-semibold text-gray-900 text-sm">{shop.name}</p>
          <p className="text-xs text-gray-500">{shop.ownerName}</p>
          {parseFloat(shop.balance) > 0 && (
            <p className="text-orange-600 font-semibold text-sm mt-1">Balance due: {formatCurrency(shop.balance)}</p>
          )}
        </div>

        <form onSubmit={handleSubmit((d) => createM.mutate({ ...d, shopId: shop.id }))} className="space-y-4">
          <div>
            <label className="label">Amount Received (Rs.) *</label>
            <input className="input" type="number" step="1" min="1" autoFocus
              {...register('amount', { required: true, min: 1 })} />
            {errors.amount && <p className="text-red-500 text-xs mt-1">Enter a valid amount</p>}
          </div>
          <div>
            <label className="label">Payment Type</label>
            <select className="input" {...register('type')}>
              {PAYMENT_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <textarea className="input resize-none" rows={2} placeholder="e.g. Partial payment, rest next visit" {...register('notes')} />
          </div>
          <button type="submit" disabled={createM.isPending} className="btn-primary w-full flex items-center justify-center gap-2">
            <Wallet className="w-4 h-4" />
            {createM.isPending ? 'Saving...' : 'Record Payment'}
          </button>
        </form>
      </div>
    </Modal>
  )
}

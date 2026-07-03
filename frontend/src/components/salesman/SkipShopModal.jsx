'use client'
import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { skippedVisitApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'

const REASONS = [
  { value: 'SHOP_CLOSED',        label: 'Shop Closed',          emoji: '🔒', desc: 'Dukaan band thi' },
  { value: 'OWNER_UNAVAILABLE',  label: 'Owner Not Available',  emoji: '👤', desc: 'Owner nahi mila' },
  { value: 'PAYMENT_DISPUTE',    label: 'Payment Issue',        emoji: '💸', desc: 'Paise ka masla' },
  { value: 'OTHER',              label: 'Other Reason',         emoji: '📝', desc: 'Koi aur wajah' },
]

export default function SkipShopModal({ routeShop, routeId, open, onClose, onSuccess }) {
  const [reason, setReason] = useState('SHOP_CLOSED')
  const [notes, setNotes] = useState('')

  const shopName = routeShop?.shop?.name || 'this shop'

  const skipM = useMutation({
    mutationFn: () => skippedVisitApi.create({
      shopId: routeShop?.shopId,
      routeId: routeId || null,
      reason,
      notes: notes.trim() || null,
    }),
    onSuccess: () => {
      toast.success(`${shopName} marked as skipped`)
      setNotes('')
      setReason('SHOP_CLOSED')
      onSuccess?.()
      onClose()
    },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  return (
    <Modal open={open} onClose={onClose} title={`Can't Visit — ${shopName}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">
          Kya hua aaj is dukaan pe? Admin ko bata denge taake follow-up ho sake.
        </p>

        <div className="grid grid-cols-2 gap-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              onClick={() => setReason(r.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${
                reason === r.value
                  ? 'border-orange-400 bg-orange-50 shadow-sm'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200'
              }`}
            >
              <span className="text-2xl block mb-1">{r.emoji}</span>
              <span className="text-sm font-semibold text-gray-800 block">{r.label}</span>
              <span className="text-xs text-gray-400">{r.desc}</span>
            </button>
          ))}
        </div>

        <div>
          <label className="label">Notes (optional)</label>
          <textarea
            className="input resize-none text-sm"
            rows={2}
            placeholder="Koi extra detail... e.g. 'Kal subah ayenge'"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-secondary">
            Cancel
          </button>
          <button
            onClick={() => skipM.mutate()}
            disabled={skipM.isPending}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {skipM.isPending ? 'Saving...' : 'Mark as Skipped'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

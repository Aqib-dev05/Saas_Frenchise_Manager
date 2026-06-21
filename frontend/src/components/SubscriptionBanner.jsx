'use client'
import { useSelector } from 'react-redux'
import { selectSub } from '@/store/slices/authSlice'
import Link from 'next/link'
import { AlertTriangle, X, Zap } from 'lucide-react'
import { useState } from 'react'

export default function SubscriptionBanner() {
  const sub = useSelector(selectSub)
  const [dismissed, setDismissed] = useState(false)
  if (!sub || dismissed) return null

  const trialDays = () => {
    if (sub.status !== 'TRIALING' || !sub.trialEndsAt) return null
    const diff = new Date(sub.trialEndsAt) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }
  const days = trialDays()

  if (sub.status === 'ACTIVE') return null
  if (sub.status === 'TRIALING' && days > 7) return null

  const isPastDue = sub.status === 'PAST_DUE'
  const isCanceled = sub.status === 'CANCELED'
  const isTrialExpiring = sub.status === 'TRIALING' && days !== null && days <= 7

  if (!isPastDue && !isCanceled && !isTrialExpiring) return null

  return (
    <div className={`flex items-center gap-3 px-4 py-3 text-sm font-medium ${isPastDue || isCanceled ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
      <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      <div className="flex-1">
        {isTrialExpiring && `Your free trial ends in ${days} day${days !== 1 ? 's' : ''}. `}
        {isPastDue && 'Payment failed. Please update your payment method. '}
        {isCanceled && 'Your subscription has been canceled. '}
        <Link href="/admin/billing" className="underline font-semibold inline-flex items-center gap-1 hover:opacity-80">
          <Zap className="w-3 h-3" /> Upgrade now
        </Link>
      </div>
      <button onClick={() => setDismissed(true)} className="hover:opacity-70 transition-opacity">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}

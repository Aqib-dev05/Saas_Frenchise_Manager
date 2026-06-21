'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { subscriptionApi } from '@/lib/api'
import { selectUser, selectOrg } from '@/store/slices/authSlice'
import { formatDate, formatCurrency } from '@/lib/utils'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Modal from '@/components/ui/Modal'
import { Check, Zap, AlertTriangle, CreditCard, Star, X, ChevronRight, RefreshCw } from 'lucide-react'

const INTERVAL_LABELS = { month: 'Monthly', year: 'Yearly' }

function PlanCard({ plan, currentPlanId, interval, onSelect, loading }) {
  const isCurrentPlan = plan.id === currentPlanId
  const price = interval === 'year' ? Number(plan.priceYearly) : Number(plan.priceMonthly)
  const features = Array.isArray(plan.features) ? plan.features : JSON.parse(plan.features || '[]')
  return (
    <div className={`relative rounded-2xl p-6 border-2 flex flex-col transition-all ${isCurrentPlan ? 'border-indigo-500 bg-indigo-50/30' : plan.isPopular ? 'border-indigo-200 hover:border-indigo-400' : 'border-gray-100 hover:border-gray-300'}`}>
      {plan.isPopular && !isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Star className="w-3 h-3" /> Popular
        </div>
      )}
      {isCurrentPlan && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
          <Check className="w-3 h-3" /> Current Plan
        </div>
      )}
      <h3 className="font-bold text-gray-900 text-lg mb-1">{plan.name}</h3>
      <div className="flex items-end gap-1 mb-1">
        <span className="text-3xl font-extrabold text-gray-900">${price}</span>
        <span className="text-gray-400 mb-1 text-sm">/{interval}</span>
      </div>
      {interval === 'year' && <p className="text-xs text-emerald-600 font-medium mb-4">Save ${(Number(plan.priceMonthly) * 12 - Number(plan.priceYearly)).toFixed(0)}/year</p>}
      <ul className="space-y-2 mb-6 flex-1">
        {features.map(f => (
          <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
            <Check className="w-4 h-4 text-indigo-500 flex-shrink-0" /> {f}
          </li>
        ))}
      </ul>
      <button
        onClick={() => onSelect(plan)}
        disabled={isCurrentPlan || loading}
        className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${isCurrentPlan ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
      >
        {isCurrentPlan ? 'Current Plan' : loading ? 'Processing...' : `Upgrade to ${plan.name}`}
      </button>
    </div>
  )
}

export default function BillingPage() {
  const qc = useQueryClient()
  const user = useSelector(selectUser)
  const org = useSelector(selectOrg)
  const [interval, setInterval] = useState('month')
  const [cancelModal, setCancelModal] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [paddleReady, setPaddleReady] = useState(false)

  const { data: plans = [], isLoading: plansLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: () => subscriptionApi.getPlans().then(r => r.data),
  })

  const { data: sub, isLoading: subLoading } = useQuery({
    queryKey: ['subscription'],
    queryFn: () => subscriptionApi.get().then(r => r.data),
  })

  const { data: paddleConfig } = useQuery({
    queryKey: ['paddle-config'],
    queryFn: () => subscriptionApi.getPaddleConfig().then(r => r.data),
  })

  // Load Paddle.js dynamically
  useEffect(() => {
    if (!paddleConfig?.clientToken) return
    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.onload = () => {
      if (window.Paddle) {
        window.Paddle.Environment.set(paddleConfig.environment || 'sandbox')
        window.Paddle.Initialize({ token: paddleConfig.clientToken })
        setPaddleReady(true)
      }
    }
    document.head.appendChild(script)
    return () => { try { document.head.removeChild(script) } catch {} }
  }, [paddleConfig])

  const cancelM = useMutation({
    mutationFn: subscriptionApi.cancel,
    onSuccess: () => { toast.success('Subscription will cancel at end of period'); qc.invalidateQueries(['subscription']); setCancelModal(false) },
    onError: () => toast.error('Failed to cancel subscription'),
  })

  const activateM = useMutation({
    mutationFn: subscriptionApi.activate,
    onSuccess: () => { toast.success('Subscription activated! 🎉'); qc.invalidateQueries(['subscription']); setCheckoutLoading(false) },
    onError: () => { toast.error('Failed to activate. Please contact support.'); setCheckoutLoading(false) },
  })

  const handleUpgrade = async (plan) => {
    const priceId = interval === 'year' ? plan.paddlePriceIdYearly : plan.paddlePriceIdMonthly
    if (!priceId || !paddleReady) {
      // Demo mode — no real Paddle price IDs set yet
      toast('Paddle not configured yet. Set PADDLE_PRICE_IDs in backend .env', { icon: 'ℹ️', duration: 5000 })
      return
    }
    setCheckoutLoading(true)
    try {
      window.Paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { organizationId: org?.id, planSlug: plan.slug },
        customer: { email: user?.email },
        successCallback: (data) => {
          activateM.mutate({ transactionId: data.transactionId, planSlug: plan.slug, interval })
        },
        closeCallback: () => setCheckoutLoading(false),
      })
    } catch (err) {
      toast.error('Checkout failed to open')
      setCheckoutLoading(false)
    }
  }

  const trialDaysLeft = () => {
    if (!sub || sub.status !== 'TRIALING' || !sub.trialEndsAt) return null
    const diff = new Date(sub.trialEndsAt) - new Date()
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  }

  const days = trialDaysLeft()

  if (plansLoading || subLoading) return <LoadingSpinner />

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing & Plan</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your subscription and billing</p>
      </div>

      {/* Current Subscription Status */}
      <div className={`rounded-2xl p-6 border-2 ${sub?.status === 'ACTIVE' ? 'border-emerald-200 bg-emerald-50/30' : sub?.status === 'TRIALING' ? 'border-amber-200 bg-amber-50/30' : 'border-red-200 bg-red-50/30'}`}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="font-bold text-gray-900 text-lg">{sub?.plan?.name || 'No Plan'}</h2>
              {sub?.status === 'ACTIVE' && <span className="badge-green">Active</span>}
              {sub?.status === 'TRIALING' && <span className="badge-yellow">Trial</span>}
              {sub?.status === 'PAST_DUE' && <span className="badge-red">Past Due</span>}
              {sub?.status === 'CANCELED' && <span className="badge-red">Canceled</span>}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              {sub?.status === 'TRIALING' && days !== null && (
                <p className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <span><strong>{days} days</strong> remaining in free trial (ends {formatDate(sub.trialEndsAt)})</span>
                </p>
              )}
              {sub?.status === 'ACTIVE' && sub?.currentPeriodEnd && (
                <p><CreditCard className="inline w-4 h-4 mr-1 text-gray-400" /> Next billing on <strong>{formatDate(sub.currentPeriodEnd)}</strong></p>
              )}
              {sub?.cancelAtPeriodEnd && <p className="text-orange-600 font-medium">⚠ Cancels at end of billing period</p>}
              {sub?.plan && (
                <div className="flex gap-4 mt-2 text-xs text-gray-500 flex-wrap">
                  <span>Up to <strong>{sub.plan.maxUsers === -1 ? '∞' : sub.plan.maxUsers}</strong> users</span>
                  <span>Up to <strong>{sub.plan.maxRoutes === -1 ? '∞' : sub.plan.maxRoutes}</strong> routes</span>
                  <span>Up to <strong>{sub.plan.maxShops === -1 ? '∞' : sub.plan.maxShops}</strong> shops</span>
                  <span>Up to <strong>{sub.plan.maxProducts === -1 ? '∞' : sub.plan.maxProducts}</strong> products</span>
                </div>
              )}
            </div>
          </div>
          {sub?.status === 'ACTIVE' && !sub?.cancelAtPeriodEnd && (
            <button onClick={() => setCancelModal(true)} className="text-sm text-red-600 hover:text-red-700 font-medium flex items-center gap-1">
              <X className="w-4 h-4" /> Cancel subscription
            </button>
          )}
        </div>
      </div>

      {/* Plans */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-bold text-gray-900 text-xl">Change Plan</h2>
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {['month', 'year'].map(i => (
              <button key={i} onClick={() => setInterval(i)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${interval === i ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {INTERVAL_LABELS[i]}
                {i === 'year' && <span className="ml-1.5 text-xs text-emerald-600 font-bold">-17%</span>}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map(plan => (
            <PlanCard
              key={plan.id}
              plan={plan}
              currentPlanId={sub?.planId}
              interval={interval}
              onSelect={handleUpgrade}
              loading={checkoutLoading}
            />
          ))}
        </div>
        {!paddleReady && (
          <p className="text-center text-xs text-gray-400 mt-4">
            💡 Paddle payment integration requires NEXT_PUBLIC_PADDLE_TOKEN in your .env.local and price IDs in backend .env
          </p>
        )}
      </div>

      {/* FAQ */}
      <div className="card p-6 space-y-4">
        <h3 className="font-semibold text-gray-900">Billing FAQ</h3>
        {[
          ['Can I change plans at any time?', 'Yes. Upgrades take effect immediately and you\'re billed the prorated difference. Downgrades take effect at the end of the billing cycle.'],
          ['What happens when my trial ends?', 'You\'ll need to subscribe to any plan to continue. Your data is preserved for 30 days after trial expiry.'],
          ['Can I cancel anytime?', 'Yes. Canceling stops your subscription at end of the current billing period. You retain access until then.'],
        ].map(([q, a]) => (
          <div key={q}>
            <p className="font-medium text-gray-900 text-sm">{q}</p>
            <p className="text-gray-500 text-sm mt-1">{a}</p>
          </div>
        ))}
      </div>

      {/* Cancel Confirmation Modal */}
      <Modal open={cancelModal} onClose={() => setCancelModal(false)} title="Cancel Subscription" size="sm">
        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-sm text-red-700">Your subscription will remain active until <strong>{formatDate(sub?.currentPeriodEnd)}</strong>, then access will be revoked.</p>
          </div>
          <p className="text-gray-600 text-sm">Are you sure you want to cancel? You can resubscribe at any time.</p>
          <div className="flex gap-3">
            <button onClick={() => setCancelModal(false)} className="btn-secondary flex-1">Keep Subscription</button>
            <button onClick={() => cancelM.mutate()} disabled={cancelM.isPending} className="btn-danger flex-1">
              {cancelM.isPending ? 'Canceling...' : 'Yes, Cancel'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

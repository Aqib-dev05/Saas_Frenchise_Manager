'use client'
import { formatCurrency } from '@/lib/utils'
import Avatar from '@/components/ui/Avatar'
import { MapPin, Phone, ShoppingCart, CheckCircle, AlertTriangle, ChevronRight, XCircle, Ban } from 'lucide-react'

const SKIP_REASON_LABELS = {
  SHOP_CLOSED:       'Shop Closed 🔒',
  OWNER_UNAVAILABLE: 'Owner Not Available 👤',
  PAYMENT_DISPUTE:   'Payment Issue 💸',
  OTHER:             'Other Reason 📝',
}

export default function ShopCard({ routeShop, index, isActive, onClick, onSkip }) {
  const shop = routeShop.shop
  const order = routeShop.todayOrder
  const skip = routeShop.todaySkip
  const hasOrder = !!order
  const isSkipped = !!skip && !hasOrder // if they eventually booked despite skip, show order

  const balance = parseFloat(shop.balance || 0)

  const shopTypeColor = {
    RETAIL:    'bg-gray-100 text-gray-700',
    WHOLESALE: 'bg-blue-100 text-blue-700',
    CREDIT:    'bg-orange-100 text-orange-700',
    CASH:      'bg-emerald-100 text-emerald-700',
  }[shop.type] || 'bg-gray-100 text-gray-700'

  // Border + bg state: skipped (orange) > ordered (green) > active (indigo) > default
  const cardStyle = isSkipped
    ? 'border-orange-200 bg-orange-50/30'
    : hasOrder
    ? 'border-emerald-200 bg-emerald-50/20'
    : isActive
    ? 'border-indigo-500 bg-indigo-50/50 shadow-md'
    : 'border-gray-100 bg-white hover:border-indigo-200'

  const badgeStyle = isSkipped
    ? 'bg-orange-500 text-white'
    : hasOrder
    ? 'bg-emerald-500 text-white'
    : isActive
    ? 'bg-indigo-600 text-white'
    : 'bg-slate-100 text-slate-600'

  const handleSkipClick = (e) => {
    e.stopPropagation() // don't open the order modal when tapping Skip
    onSkip?.(routeShop)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick?.() }}
      className={`w-full text-left rounded-2xl border-2 p-4 transition-all hover:shadow-md cursor-pointer ${cardStyle}`}
    >
      <div className="flex items-start gap-3">
        {/* Visit number / status badge */}
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0 ${badgeStyle}`}>
          {hasOrder
            ? <CheckCircle className="w-5 h-5" />
            : isSkipped
            ? <Ban className="w-5 h-5" />
            : index + 1
          }
        </div>

        {/* Shop info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Avatar src={shop.ownerPhoto} name={shop.ownerName} size="xs" />
            <h3 className="font-semibold text-gray-900 text-sm">{shop.name}</h3>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${shopTypeColor}`}>{shop.type}</span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">{shop.ownerName}</p>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400 flex-wrap">
            <span className="flex items-center gap-1">
              <Phone className="w-3 h-3" />
              <a
                href={`tel:${shop.phone}`}
                onClick={(e) => e.stopPropagation()}
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {shop.phone}
              </a>
            </span>
            <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{shop.address}</span>
          </div>

          {/* Balance warning */}
          {balance > 0 && (
            <div className="mt-2 flex items-center gap-1.5 text-xs text-orange-600 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              Balance due: {formatCurrency(balance)}
            </div>
          )}

          {/* Skipped state */}
          {isSkipped && (
            <div className="mt-2 bg-orange-50 border border-orange-200 rounded-xl px-3 py-2">
              <div className="flex items-center gap-1.5 text-orange-700">
                <XCircle className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Skipped Today</span>
              </div>
              <p className="text-xs text-orange-600 mt-0.5">
                {SKIP_REASON_LABELS[skip.reason] || skip.reason}
                {skip.notes && ` — ${skip.notes}`}
              </p>
            </div>
          )}

          {/* Order info if booked */}
          {hasOrder && (
            <div className="mt-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-emerald-700">
                  <ShoppingCart className="w-3.5 h-3.5" />
                  <span className="text-xs font-semibold">Order Booked</span>
                </div>
                <span className="text-xs font-bold text-emerald-700">{formatCurrency(order.totalAmount)}</span>
              </div>
              <p className="text-xs text-emerald-600 mt-0.5">{order.items?.length} items · {order.orderNo}</p>
            </div>
          )}

          {/* Skip button — only show when shop has neither an order nor a skip yet */}
          {!hasOrder && !isSkipped && (
            <div className="mt-2">
              <button
                onClick={handleSkipClick}
                className="text-xs text-gray-400 hover:text-orange-600 hover:bg-orange-50 px-2.5 py-1 rounded-lg border border-gray-200 hover:border-orange-200 transition-all flex items-center gap-1.5"
              >
                <Ban className="w-3 h-3" />
                Can't Visit Today
              </button>
            </div>
          )}
        </div>

        <ChevronRight className={`w-4 h-4 flex-shrink-0 mt-1 ${isActive ? 'text-indigo-500' : 'text-gray-300'}`} />
      </div>
    </div>
  )
}

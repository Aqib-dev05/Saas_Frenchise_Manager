'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { useSelector } from 'react-redux'
import { routeApi } from '@/lib/api'
import { selectUser } from '@/store/slices/authSlice'
import { DAY_NAMES, formatCurrency } from '@/lib/utils'
import ShopCard from '@/components/salesman/ShopCard'
import OrderModal from '@/components/salesman/OrderModal'
import SkipShopModal from '@/components/salesman/SkipShopModal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Map, ListOrdered, Calendar, CheckCircle, ShoppingCart, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'

// Dynamic import — Leaflet doesn't support SSR
const RouteMap = dynamic(() => import('@/components/salesman/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-slate-100 rounded-2xl">
      <div className="text-center">
        <Map className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-pulse" />
        <p className="text-slate-400 text-sm">Loading map...</p>
      </div>
    </div>
  ),
})

export default function SalesmanPage() {
  const user = useSelector(selectUser)
  const [view, setView] = useState('split') // 'split' | 'map' | 'list'
  const [activeShop, setActiveShop] = useState(null)
  const [orderModal, setOrderModal] = useState(null)
  const [skipModal, setSkipModal] = useState(null)
  const [routeIdx, setRouteIdx] = useState(0)

  const todayName = DAY_NAMES[new Date().getDay()]
  const todayDate = new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const { data: routes = [], isLoading, refetch } = useQuery({
    queryKey: ['today-routes'],
    queryFn: () => routeApi.getToday().then(r => r.data),
    refetchInterval: 30000,
  })

  const currentRoute = routes[routeIdx] || null
  const shops = currentRoute?.routeShops || []
  const orderedCount = shops.filter(rs => rs.todayOrder).length
  const skippedCount = shops.filter(rs => rs.todaySkip && !rs.todayOrder).length
  const totalRouteValue = shops.filter(rs => rs.todayOrder)
    .reduce((s, rs) => s + Number(rs.todayOrder.totalAmount), 0)

  const handleShopClick = (routeShop) => {
    setActiveShop(routeShop)
    setOrderModal(routeShop)
  }

  const handleSkip = (routeShop) => {
    setSkipModal(routeShop)
  }

  if (isLoading) return <LoadingSpinner text="Loading your route..." />

  if (routes.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">No Route Today</h2>
          <p className="text-gray-500 text-sm">
            You don&apos;t have a route scheduled for <strong>{todayName}</strong>.
            Check with your admin if you expected one.
          </p>
          <div className="mt-6 bg-slate-50 rounded-xl p-4 text-left text-sm text-gray-600">
            <p className="font-semibold mb-1">Your schedule:</p>
            <p className="text-gray-400 text-xs">No routes assigned to {todayName}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h1 className="text-xl font-bold text-gray-900">{currentRoute?.name}</h1>
            <span className="badge-blue text-xs">{todayName}</span>
          </div>
          <p className="text-sm text-gray-400">{todayDate}</p>
        </div>

        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {/* Route switcher if multiple */}
          {routes.length > 1 && (
            <div className="flex items-center gap-2">
              <button onClick={() => setRouteIdx(Math.max(0, routeIdx - 1))} disabled={routeIdx === 0}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
              <span className="text-sm text-gray-600">{routeIdx + 1}/{routes.length}</span>
              <button onClick={() => setRouteIdx(Math.min(routes.length - 1, routeIdx + 1))} disabled={routeIdx === routes.length - 1}
                className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="font-bold text-emerald-600">{orderedCount}/{shops.length}</div>
              <div className="text-xs text-gray-400">Visited</div>
            </div>
            {skippedCount > 0 && (
              <div className="text-center">
                <div className="font-bold text-orange-500">{skippedCount}</div>
                <div className="text-xs text-gray-400">Skipped</div>
              </div>
            )}
            <div className="text-center">
              <div className="font-bold text-indigo-600">{formatCurrency(totalRouteValue)}</div>
              <div className="text-xs text-gray-400">Booked</div>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex items-center bg-gray-100 rounded-xl p-1 gap-1">
            {[
              { key: 'split', icon: Map, label: 'Split' },
              { key: 'map', icon: Map, label: 'Map' },
              { key: 'list', icon: ListOrdered, label: 'List' },
            ].map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setView(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${view === key ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 flex-shrink-0">
        <div
          className="h-full bg-emerald-500 transition-all duration-700"
          style={{ width: shops.length > 0 ? `${(orderedCount / shops.length) * 100}%` : '0%' }}
        />
      </div>

      {/* Main content area */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

        {/* Shop list panel */}
        {(view === 'list' || view === 'split') && (
          <div className={`${view === 'split' ? 'w-full lg:w-96 h-1/2 lg:h-full' : 'w-full h-full'} flex flex-col border-b lg:border-b-0 lg:border-r border-gray-100 bg-white overflow-hidden`}>
            {/* List header */}
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex-shrink-0">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {shops.length} Shops on Route
              </p>
            </div>

            {/* Shops scroll list */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {shops.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No shops on this route</p>
                </div>
              ) : shops.map((rs, idx) => (
                <ShopCard
                  key={rs.id}
                  routeShop={rs}
                  index={idx}
                  isActive={activeShop?.shopId === rs.shopId}
                  onClick={() => handleShopClick(rs)}
                  onSkip={handleSkip}
                />
              ))}
            </div>

            {/* Summary footer */}
            {(orderedCount > 0 || skippedCount > 0) && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {orderedCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-semibold text-emerald-700">{orderedCount} booked</span>
                      </div>
                    )}
                    {skippedCount > 0 && (
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-semibold text-orange-600">{skippedCount} skipped</span>
                      </div>
                    )}
                  </div>
                  {orderedCount > 0 && (
                    <span className="font-bold text-emerald-700">{formatCurrency(totalRouteValue)}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Map panel */}
        {(view === 'map' || view === 'split') && (
          <div className={`${view === 'split' ? 'w-full h-1/2 lg:h-full lg:flex-1' : 'w-full h-full'} relative overflow-hidden`}>
            <div className="absolute inset-0 p-3">
              <RouteMap
                shops={shops}
                onShopClick={handleShopClick}
                activeShopId={activeShop?.shopId}
              />
            </div>

            {/* Floating shop counter on map */}
            <div className="absolute top-5 right-5 bg-white rounded-xl shadow-lg px-4 py-2.5 border border-gray-100 z-10">
              <div className="flex items-center gap-3 text-sm">
                <div>
                  <div className="font-bold text-gray-900">{orderedCount}/{shops.length}</div>
                  <div className="text-xs text-gray-400">Shops done</div>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div>
                  <div className="font-bold text-indigo-600">{formatCurrency(totalRouteValue)}</div>
                  <div className="text-xs text-gray-400">Booked</div>
                </div>
              </div>
            </div>

            {/* Map legend */}
            <div className="absolute bottom-5 left-5 bg-white rounded-xl shadow-lg px-4 py-3 border border-gray-100 z-10">
              <p className="text-xs font-semibold text-gray-600 mb-2">Map Legend</p>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 rounded-full bg-slate-400 flex items-center justify-center text-white text-[10px] font-bold">1</div>
                  Pending
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center"><CheckCircle className="w-2.5 h-2.5 text-white" /></div>
                  Order booked
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Order booking modal */}
      <OrderModal
        routeShop={orderModal}
        routeId={currentRoute?.id}
        open={!!orderModal}
        onClose={() => { setOrderModal(null); setActiveShop(null) }}
        onSuccess={refetch}
      />

      {/* Skip shop modal — "Can't Visit Today" */}
      <SkipShopModal
        routeShop={skipModal}
        routeId={currentRoute?.id}
        open={!!skipModal}
        onClose={() => setSkipModal(null)}
        onSuccess={refetch}
      />
    </div>
  )
}

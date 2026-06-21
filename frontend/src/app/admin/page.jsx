'use client'
import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '@/lib/api'
import { formatCurrency, formatDate } from '@/lib/utils'
import StatCard from '@/components/ui/StatCard'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { StatusBadge } from '@/components/ui/Badge'
import { ShoppingCart, Package, Store, TrendingUp, AlertTriangle, CreditCard, Map, Users } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

export default function AdminDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({ queryKey: ['stats'], queryFn: () => dashboardApi.getStats().then(r => r.data), refetchInterval: 60000 })
  const { data: dailySales = [] } = useQuery({ queryKey: ['daily-sales'], queryFn: () => dashboardApi.getDailySales(7).then(r => r.data) })
  const { data: lowStock = [] } = useQuery({ queryKey: ['low-stock'], queryFn: () => dashboardApi.getLowStock().then(r => r.data) })
  const { data: topShops = [] } = useQuery({ queryKey: ['top-shops'], queryFn: () => dashboardApi.getTopShops().then(r => r.data) })
  const { data: creditReport = [] } = useQuery({ queryKey: ['credit-report'], queryFn: () => dashboardApi.getCreditReport().then(r => r.data) })

  if (statsLoading) return <LoadingSpinner />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">{new Date().toLocaleDateString('en-PK', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Today's Revenue" value={formatCurrency(stats?.todayRevenue)} subtitle="Confirmed + Delivered" icon={TrendingUp} color="green" />
        <StatCard title="Today's Orders" value={stats?.todayOrders ?? 0} subtitle={`${stats?.pendingOrders ?? 0} pending approval`} icon={ShoppingCart} color="blue" />
        <StatCard title="Month Revenue" value={formatCurrency(stats?.monthRevenue)} subtitle="This month" icon={CreditCard} color="indigo" />
        <StatCard title="Total Shops" value={stats?.totalShops ?? 0} subtitle={`${stats?.activeRoutes ?? 0} active routes`} icon={Store} color="purple" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="Credit Outstanding" value={formatCurrency(stats?.totalCreditOutstanding)} subtitle="Total due from shops" icon={AlertTriangle} color="orange" />
        <StatCard title="Low Stock Items" value={stats?.lowStockCount ?? 0} subtitle="Needs restocking" icon={Package} color="red" />
        <StatCard title="Products" value={stats?.totalProducts ?? 0} subtitle="Active products" icon={Package} color="blue" />
      </div>

      {/* Revenue Chart */}
      <div className="card p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Revenue — Last 7 Days</h2>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={dailySales} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={d => new Date(d).toLocaleDateString('en',{month:'short',day:'numeric'})} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v) => [formatCurrency(v), 'Revenue']} labelFormatter={l => formatDate(l)} />
            <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2} fill="url(#revGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Low Stock */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" /> Low Stock Alert
          </h2>
          {lowStock.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">All stock levels are healthy ✓</p>
          ) : (
            <div className="space-y-3">
              {lowStock.map(p => (
                <div key={p.id} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{p.name}</p>
                    <p className="text-xs text-gray-400">{p.category} · Min: {p.minStock}</p>
                  </div>
                  <span className={`text-sm font-bold ${p.stock === 0 ? 'text-red-600' : 'text-orange-500'}`}>
                    {p.stock} {p.unit}s
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Shops */}
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Top Shops This Month</h2>
          {topShops.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-6">No sales data yet</p>
          ) : (
            <div className="space-y-3">
              {topShops.map((s, i) => (
                <div key={s.shopId} className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold">{i+1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.shop?.name}</p>
                    <p className="text-xs text-gray-400">{s._count} orders</p>
                  </div>
                  <span className="text-sm font-semibold text-emerald-600">{formatCurrency(s.revenue)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Credit Report */}
      {creditReport.length > 0 && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Outstanding Credit</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-xs text-gray-500 uppercase border-b border-gray-100">
                <th className="text-left pb-2 font-semibold">Shop</th>
                <th className="text-left pb-2 font-semibold">Owner</th>
                <th className="text-left pb-2 font-semibold">Type</th>
                <th className="text-right pb-2 font-semibold">Balance Due</th>
                <th className="text-right pb-2 font-semibold">Credit Limit</th>
              </tr></thead>
              <tbody className="divide-y divide-gray-50">
                {creditReport.slice(0,8).map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50">
                    <td className="py-2.5 font-medium text-gray-900">{s.name}</td>
                    <td className="py-2.5 text-gray-500">{s.ownerName}</td>
                    <td className="py-2.5"><span className="badge-blue">{s.type}</span></td>
                    <td className="py-2.5 text-right font-semibold text-orange-600">{formatCurrency(s.balance)}</td>
                    <td className="py-2.5 text-right text-gray-400">{formatCurrency(s.creditLimit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

import { TrendingUp, TrendingDown } from 'lucide-react'
export default function StatCard({ title, value, subtitle, icon: Icon, color = 'indigo', trend }) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600', blue: 'bg-blue-50 text-blue-600',
    green: 'bg-emerald-50 text-emerald-600', yellow: 'bg-amber-50 text-amber-600',
    red: 'bg-red-50 text-red-600', orange: 'bg-orange-50 text-orange-600',
    purple: 'bg-purple-50 text-purple-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
          {trend !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              {Math.abs(trend)}% from last week
            </div>
          )}
        </div>
        {Icon && (
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  )
}

'use client'
import { useState, Fragment } from 'react'
import { useQuery } from '@tanstack/react-query'
import { auditApi } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import { RoleBadge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { History, ChevronDown, ChevronUp, ShieldCheck, Search, X } from 'lucide-react'

const ACTION_COLORS = {
  CREATE: 'bg-emerald-100 text-emerald-700',
  UPDATE: 'bg-blue-100 text-blue-700',
  DELETE: 'bg-red-100 text-red-700',
  STATUS_CHANGE: 'bg-amber-100 text-amber-700',
  LOGIN: 'bg-slate-100 text-slate-600',
  REGISTER: 'bg-indigo-100 text-indigo-700',
  PASSWORD_RESET: 'bg-purple-100 text-purple-700',
}

export default function AuditLogPage() {
  const [filters, setFilters] = useState({ resource: '', action: '', userId: '', from: '', to: '', q: '' })
  const [page, setPage] = useState(1)
  const [expandedId, setExpandedId] = useState(null)

  const { data: filterOptions } = useQuery({ queryKey: ['audit-filters'], queryFn: () => auditApi.getFilters().then(r => r.data) })
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', filters, page],
    queryFn: () => auditApi.getAll({ ...filters, page, limit: 30 }).then(r => r.data),
  })

  const setFilter = (patch) => { setFilters((f) => ({ ...f, ...patch })); setPage(1) }
  const clearFilters = () => { setFilters({ resource: '', action: '', userId: '', from: '', to: '', q: '' }); setPage(1) }
  const hasActiveFilters = Object.values(filters).some(Boolean)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><History className="w-6 h-6 text-indigo-600" />Audit Log</h1>
        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5" />Read-only activity trail — entries cannot be edited or deleted by anyone, including admins.
        </p>
      </div>

      <div className="card p-4 flex flex-wrap items-end gap-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            placeholder="Search description…"
            value={filters.q}
            onChange={(e) => setFilter({ q: e.target.value })}
            className="border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm w-full"
          />
        </div>
        <select value={filters.resource} onChange={(e) => setFilter({ resource: e.target.value })} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm">
          <option value="">All resources</option>
          {filterOptions?.resources.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select value={filters.action} onChange={(e) => setFilter({ action: e.target.value })} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm">
          <option value="">All actions</option>
          {filterOptions?.actions.map((a) => <option key={a} value={a}>{a.replace('_', ' ')}</option>)}
        </select>
        <select value={filters.userId} onChange={(e) => setFilter({ userId: e.target.value })} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm">
          <option value="">Everyone</option>
          {filterOptions?.users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        <input type="date" value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
        <span className="text-gray-400 text-sm">to</span>
        <input type="date" value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} className="border border-gray-200 rounded-lg px-2.5 py-2 text-sm" />
        {hasActiveFilters && (
          <button onClick={clearFilters} className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-600 px-2 py-2">
            <X className="w-3.5 h-3.5" />Clear
          </button>
        )}
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3">When</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Action</th>
                <th className="text-left px-4 py-3">Resource</th>
                <th className="text-left px-4 py-3">Description</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data?.logs.map((log) => (
                <Fragment key={log.id}>
                  <tr className="hover:bg-gray-50/50 cursor-pointer" onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-gray-900">{log.userName || 'System'}</span>
                        {log.userRole && <RoleBadge role={log.userRole} />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${ACTION_COLORS[log.action] || 'bg-gray-100 text-gray-700'}`}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{log.resource}</td>
                    <td className="px-4 py-3 text-gray-700">{log.description}</td>
                    <td className="px-4 py-3">
                      {log.changes && Object.keys(log.changes).length > 0 && (
                        expandedId === log.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </td>
                  </tr>
                  {expandedId === log.id && log.changes && Object.keys(log.changes).length > 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-4 bg-gray-50/50">
                        <div className="bg-slate-900 rounded-lg p-3 text-xs text-slate-200 font-mono overflow-x-auto">
                          <pre>{JSON.stringify(log.changes, null, 2)}</pre>
                        </div>
                        {log.ipAddress && <p className="text-xs text-gray-400 mt-1.5">IP: {log.ipAddress}</p>}
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
              {data?.logs.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-12">No activity matches these filters</td></tr>}
            </tbody>
          </table>

          {data && data.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 text-sm">
              <span className="text-gray-500">Page {data.page} of {data.pages} · {data.total} entries</span>
              <div className="flex gap-2">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Prev</button>
                <button onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages} className="btn-secondary px-3 py-1.5 disabled:opacity-40">Next</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

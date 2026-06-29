'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { routeApi, shopApi, userApi } from '@/lib/api'
import { getDayNames, DAY_NAMES, getErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, MapPin, User, Calendar, ChevronRight, X, GripVertical } from 'lucide-react'

const DAY_OPTS = [0,1,2,3,4,5,6]

function RouteForm({ defaultValues, onSubmit, loading, salesmen }) {
  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: defaultValues || { daysOfWeek: [] }
  })
  const days = watch('daysOfWeek') || []
  const toggle = (d) => {
    const n = days.includes(d) ? days.filter(x => x!==d) : [...days, d]
    setValue('daysOfWeek', n)
  }
  return (
    <form onSubmit={handleSubmit(d => onSubmit({ ...d, daysOfWeek: days }))} className="space-y-4">
      <div><label className="label">Route Name *</label><input className="input" {...register('name', { required: true })} /></div>
      <div><label className="label">Description</label><input className="input" {...register('description')} /></div>
      <div><label className="label">Assign Salesman *</label>
        <select className="input" {...register('salesmanId', { required: true })}>
          <option value="">Select salesman...</option>
          {salesmen.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>
      <div>
        <label className="label">Working Days *</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {DAY_OPTS.map(d => (
            <button key={d} type="button" onClick={() => toggle(d)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${days.includes(d) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'}`}>
              {DAY_NAMES[d].slice(0,3)}
            </button>
          ))}
        </div>
      </div>
      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Save Route'}</button>
    </form>
  )
}

export default function RoutesPage() {
  const qc = useQueryClient()
  const [modal, setModal] = useState(null)
  const [shopModal, setShopModal] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)

  const { data: routes = [], isLoading } = useQuery({ queryKey: ['routes'], queryFn: () => routeApi.getAll().then(r => r.data) })
  const { data: allShops = [] } = useQuery({ queryKey: ['shops-lookup-routes'], queryFn: () => shopApi.getLookup({ limit: 500 }).then(r => r.data.shops) })
  const { data: users = [] } = useQuery({ queryKey: ['users'], queryFn: () => userApi.getAll().then(r => r.data) })
  const salesmen = users.filter(u => u.role === 'SALESMAN' && u.isActive)

  const createM = useMutation({ mutationFn: routeApi.create, onSuccess: () => { toast.success('Route created!'); qc.invalidateQueries(['routes']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const updateM = useMutation({ mutationFn: ({ id, ...d }) => routeApi.update(id, d), onSuccess: () => { toast.success('Route updated!'); qc.invalidateQueries(['routes']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const deleteM = useMutation({ mutationFn: (id) => routeApi.delete(id), onSuccess: () => { toast.success('Route removed'); qc.invalidateQueries(['routes']); setDelConfirm(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const addShopM = useMutation({ mutationFn: ({ routeId, shopId }) => routeApi.addShop(routeId, { shopId }), onSuccess: () => { toast.success('Shop added to route'); qc.invalidateQueries(['routes']) }, onError: e => toast.error(getErrorMessage(e)) })
  const removeShopM = useMutation({ mutationFn: ({ routeId, shopId }) => routeApi.removeShop(routeId, shopId), onSuccess: () => { toast.success('Shop removed'); qc.invalidateQueries(['routes']) }, onError: e => toast.error(getErrorMessage(e)) })

  const routeShopIds = (shopModal) ? shopModal.routeShops?.map(rs => rs.shopId) || [] : []
  const availableShops = allShops.filter(s => !routeShopIds.includes(s.id))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Routes</h1><p className="text-gray-500 text-sm">{routes.length} routes configured</p></div>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />New Route</button>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {routes.map(route => (
            <div key={route.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-gray-900 text-base">{route.name}</h3>
                  {route.description && <p className="text-sm text-gray-500 mt-0.5">{route.description}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setModal({ ...route, salesmanId: route.salesmanId })} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => setDelConfirm(route)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {route.daysOfWeek?.sort().map(d => (
                  <span key={d} className="badge-blue">{DAY_NAMES[d].slice(0,3)}</span>
                ))}
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5" />{route.salesman?.name}</span>
                <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{route.routeShops?.length || 0} shops</span>
              </div>
              {/* Shop list */}
              <div className="border-t border-gray-100 pt-3 space-y-2">
                {route.routeShops?.map((rs, i) => (
                  <div key={rs.id} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{i+1}</span>
                    <span className="flex-1 text-gray-700">{rs.shop?.name}</span>
                    <span className="text-xs text-gray-400">{rs.shop?.city}</span>
                    <button onClick={() => removeShopM.mutate({ routeId: route.id, shopId: rs.shopId })} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                <button onClick={() => setShopModal(route)} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1 mt-2">
                  <Plus className="w-3.5 h-3.5" /> Add shop to route
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'New Route' : 'Edit Route'}>
        <RouteForm
          defaultValues={modal && modal !== 'create' ? { name: modal.name, description: modal.description, salesmanId: modal.salesmanId, daysOfWeek: modal.daysOfWeek || [] } : {}}
          onSubmit={d => modal === 'create' ? createM.mutate(d) : updateM.mutate({ id: modal.id, ...d })}
          loading={createM.isPending || updateM.isPending}
          salesmen={salesmen}
        />
      </Modal>

      <Modal open={!!shopModal} onClose={() => setShopModal(null)} title={`Add Shop to: ${shopModal?.name}`}>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {availableShops.length === 0 ? <p className="text-gray-400 text-sm text-center py-6">All shops already in this route</p> :
            availableShops.map(s => (
              <button key={s.id} onClick={() => { addShopM.mutate({ routeId: shopModal.id, shopId: s.id }); setShopModal(prev => ({ ...prev, routeShops: [...(prev.routeShops||[]), { shopId: s.id }] })) }}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-100 hover:border-indigo-300 hover:bg-indigo-50 text-left transition-colors">
                <div>
                  <p className="font-medium text-gray-900 text-sm">{s.name}</p>
                  <p className="text-xs text-gray-400">{s.address}</p>
                </div>
                <span className="badge-gray text-xs">{s.type}</span>
              </button>
            ))
          }
        </div>
      </Modal>

      <Modal open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Delete Route" size="sm">
        <p className="text-gray-600 mb-6">Delete route <strong>{delConfirm?.name}</strong>?</p>
        <div className="flex gap-3">
          <button onClick={() => setDelConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => deleteM.mutate(delConfirm.id)} className="btn-danger flex-1">Delete</button>
        </div>
      </Modal>
    </div>
  )
}

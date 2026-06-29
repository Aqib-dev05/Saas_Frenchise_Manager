'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { shopApi } from '@/lib/api'
import { formatCurrency, formatDateTime, getErrorMessage, SHOP_TYPES } from '@/lib/utils'
import { ShopTypeBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import ImageUpload from '@/components/ui/ImageUpload'
import { Plus, Edit2, Trash2, Search, MapPin, Phone, Eye, KeyRound, Copy, Check, ShieldOff } from 'lucide-react'

const LocationPicker = dynamic(() => import('@/components/admin/LocationPicker'), {
  ssr: false,
  loading: () => <div className="h-64 bg-slate-100 rounded-xl animate-pulse flex items-center justify-center text-slate-400 text-sm">Loading map...</div>,
})

function ShopForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({ defaultValues })
  const lat = watch('latitude')
  const lng = watch('longitude')
  const ownerPhoto = watch('ownerPhoto')

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="label">Owner Photo</label>
        <ImageUpload
          value={ownerPhoto}
          onChange={(url) => setValue('ownerPhoto', url)}
          folder="shops"
          shape="circle"
          size="sm"
        />
        <input type="hidden" {...register('ownerPhoto')} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label">Shop Name *</label><input className="input" {...register('name', { required: true })} /></div>
        <div><label className="label">Owner Name *</label><input className="input" {...register('ownerName', { required: true })} /></div>
        <div><label className="label">Phone *</label><input className="input" {...register('phone', { required: true })} /></div>
        <div className="col-span-2"><label className="label">Address *</label><input className="input" {...register('address', { required: true })} /></div>
        <div><label className="label">City</label><input className="input" {...register('city')} /></div>
        <div><label className="label">Shop Type</label>
          <select className="input" {...register('type')}>
            {SHOP_TYPES.map(t => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div><label className="label">Credit Limit (Rs.)</label><input className="input" type="number" {...register('creditLimit')} /></div>
        <div></div>
      </div>

      {/* Live map location picker */}
      <div>
        <label className="label">Shop Location (click map, or tap 📍 for current location)</label>
        <LocationPicker
          latitude={lat ? Number(lat) : null}
          longitude={lng ? Number(lng) : null}
          onChange={(la, lo) => { setValue('latitude', la); setValue('longitude', lo) }}
        />
        {lat && lng ? (
          <p className="text-xs text-gray-400 mt-1.5">📍 {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}</p>
        ) : (
          <p className="text-xs text-amber-600 mt-1.5">No location set yet — shop won&apos;t appear on route maps until you set one.</p>
        )}
        <input type="hidden" {...register('latitude')} />
        <input type="hidden" {...register('longitude')} />
      </div>

      <div><label className="label">Notes</label><textarea className="input resize-none" rows={2} {...register('notes')} /></div>

      <button type="submit" disabled={loading} className="btn-primary w-full">{loading ? 'Saving...' : 'Save Shop'}</button>
    </form>
  )
}

export default function ShopsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [modal, setModal] = useState(null)
  const [viewModal, setViewModal] = useState(null)
  const [delConfirm, setDelConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['shops', search, typeFilter],
    queryFn: () => shopApi.getAll({ search, type: typeFilter || undefined, limit: 200 }).then(r => r.data),
  })

  const { data: txData } = useQuery({
    queryKey: ['shop-tx', viewModal?.id],
    queryFn: () => shopApi.getTransactions(viewModal.id).then(r => r.data),
    enabled: !!viewModal,
  })

  const createM = useMutation({ mutationFn: shopApi.create, onSuccess: () => { toast.success('Shop added!'); qc.invalidateQueries(['shops']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const updateM = useMutation({ mutationFn: ({ id, ...d }) => shopApi.update(id, d), onSuccess: () => { toast.success('Shop updated!'); qc.invalidateQueries(['shops']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const deleteM = useMutation({ mutationFn: (id) => shopApi.delete(id), onSuccess: () => { toast.success('Shop removed'); qc.invalidateQueries(['shops']); setDelConfirm(null) }, onError: e => toast.error(getErrorMessage(e)) })

  const [revealedCreds, setRevealedCreds] = useState(null) // { code, password } — shown exactly once
  const generateCredsM = useMutation({
    mutationFn: (id) => shopApi.generatePortalCredentials(id),
    onSuccess: (res) => {
      setRevealedCreds(res.data)
      setViewModal((v) => v ? { ...v, portalEnabled: true, portalCode: res.data.code } : v)
      qc.invalidateQueries(['shops'])
    },
    onError: e => toast.error(getErrorMessage(e)),
  })
  const toggleAccessM = useMutation({
    mutationFn: ({ id, enabled }) => shopApi.togglePortalAccess(id, enabled),
    onSuccess: (res) => {
      toast.success(res.data.portalEnabled ? 'Portal access enabled' : 'Portal access disabled')
      setViewModal((v) => v ? { ...v, portalEnabled: res.data.portalEnabled } : v)
      qc.invalidateQueries(['shops'])
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const shops = data?.shops || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Shops</h1><p className="text-gray-500 text-sm">{shops.length} registered shops</p></div>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Add Shop</button>
      </div>
      <div className="flex gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input className="input pl-9" placeholder="Search shops..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input max-w-[160px]" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {SHOP_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {shops.map(s => (
            <div key={s.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar src={s.ownerPhoto} name={s.ownerName} size="md" />
                  <div>
                    <h3 className="font-semibold text-gray-900">{s.name}</h3>
                    <p className="text-sm text-gray-500">{s.ownerName}</p>
                  </div>
                </div>
                <ShopTypeBadge type={s.type} />
              </div>
              <div className="space-y-1.5 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5" />
                  <a href={`tel:${s.phone}`} className="text-indigo-600 hover:underline">{s.phone}</a>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  {s.address}, {s.city}
                  {!s.latitude && <span className="text-amber-500 text-[11px] ml-1">(no GPS pin)</span>}
                </div>
              </div>
              {parseFloat(s.balance) > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">Balance Due</span>
                  <span className="font-semibold text-orange-600 text-sm">{formatCurrency(s.balance)}</span>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button onClick={() => setViewModal(s)} className="flex-1 btn-secondary text-xs py-1.5 flex items-center justify-center gap-1"><Eye className="w-3.5 h-3.5" />View</button>
                <button onClick={() => setModal(s)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                <button onClick={() => setDelConfirm(s)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Shop' : 'Edit Shop'}>
        <ShopForm
          defaultValues={modal && modal !== 'create' ? { ...modal, creditLimit: modal?.creditLimit?.toString() } : { type: 'RETAIL', city: 'Lahore', creditLimit: '0' }}
          onSubmit={d => modal === 'create' ? createM.mutate(d) : updateM.mutate({ id: modal.id, ...d })}
          loading={createM.isPending || updateM.isPending}
        />
      </Modal>

      {/* View/Transaction modal */}
      <Modal open={!!viewModal} onClose={() => setViewModal(null)} title={viewModal?.name} size="lg">
        {viewModal && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-gray-50 rounded-xl p-4"><p className="text-gray-500 text-xs mb-1">Balance Due</p><p className="font-bold text-orange-600 text-xl">{formatCurrency(viewModal.balance)}</p></div>
              <div className="bg-gray-50 rounded-xl p-4"><p className="text-gray-500 text-xs mb-1">Credit Limit</p><p className="font-bold text-gray-900 text-xl">{formatCurrency(viewModal.creditLimit)}</p></div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm flex items-center gap-1.5"><KeyRound className="w-4 h-4 text-indigo-600" />Shop Owner Portal</h3>
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${viewModal.portalEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'}`}>
                  {viewModal.portalEnabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
              {viewModal.portalCode && (
                <p className="text-xs text-gray-500 mb-1">Login code: <span className="font-mono font-semibold text-gray-700">{viewModal.portalCode}</span></p>
              )}
              {viewModal.portalLastLoginAt && (
                <p className="text-xs text-gray-400 mb-2">Last login: {formatDateTime(viewModal.portalLastLoginAt)}</p>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => generateCredsM.mutate(viewModal.id)}
                  disabled={generateCredsM.isPending}
                  className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                >
                  <KeyRound className="w-3.5 h-3.5" />{viewModal.portalCode ? 'Reset Password' : 'Generate Access'}
                </button>
                {viewModal.portalCode && (
                  <button
                    onClick={() => toggleAccessM.mutate({ id: viewModal.id, enabled: !viewModal.portalEnabled })}
                    disabled={toggleAccessM.isPending}
                    className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
                  >
                    <ShieldOff className="w-3.5 h-3.5" />{viewModal.portalEnabled ? 'Disable Access' : 'Enable Access'}
                  </button>
                )}
              </div>
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">Recent Orders</h3>
              {txData?.orders?.length === 0 ? <p className="text-gray-400 text-sm">No orders yet</p> : (
                <div className="space-y-2">
                  {txData?.orders?.slice(0,5).map(o => (
                    <div key={o.id} className="flex items-center justify-between text-sm border-b border-gray-100 pb-2">
                      <div><p className="font-medium text-gray-900">{o.orderNo}</p><p className="text-xs text-gray-400">{new Date(o.createdAt).toLocaleDateString()}</p></div>
                      <div className="text-right"><p className="font-semibold text-gray-900">{formatCurrency(o.totalAmount)}</p><span className={`text-xs px-2 py-0.5 rounded-full ${o.status==='DELIVERED'?'bg-green-100 text-green-700':o.status==='PENDING'?'bg-yellow-100 text-yellow-700':'bg-blue-100 text-blue-700'}`}>{o.status}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      <Modal open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Remove Shop" size="sm">
        <p className="text-gray-600 mb-6">Remove <strong>{delConfirm?.name}</strong>?</p>
        <div className="flex gap-3">
          <button onClick={() => setDelConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => deleteM.mutate(delConfirm.id)} disabled={deleteM.isPending} className="btn-danger flex-1">Remove</button>
        </div>
      </Modal>

      <Modal open={!!revealedCreds} onClose={() => setRevealedCreds(null)} title="Portal Access Generated" size="sm">
        <p className="text-sm text-gray-600 mb-4">
          Share these with the shop owner now — <strong>the password won&apos;t be shown again.</strong> Resetting later generates a new password.
        </p>
        <CredentialField label="Portal Code" value={revealedCreds?.code} />
        <CredentialField label="Password" value={revealedCreds?.password} />
        <button onClick={() => setRevealedCreds(null)} className="btn-primary w-full mt-4">I&apos;ve saved this</button>
      </Modal>
    </div>
  )
}

function CredentialField({ label, value }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="mb-3">
      <label className="label">{label}</label>
      <div className="flex items-center gap-2">
        <code className="flex-1 bg-gray-100 rounded-lg px-3 py-2 font-mono text-sm font-semibold text-gray-800">{value}</code>
        <button onClick={copy} className="btn-secondary px-3 py-2">{copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}</button>
      </div>
    </div>
  )
}

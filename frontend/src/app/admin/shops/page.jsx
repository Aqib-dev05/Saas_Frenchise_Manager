'use client'
import { useState } from 'react'
import dynamic from 'next/dynamic'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { shopApi, skippedVisitApi } from '@/lib/api'
import { formatCurrency, formatDateTime, getErrorMessage, SHOP_TYPES } from '@/lib/utils'
import { ShopTypeBadge } from '@/components/ui/Badge'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import Avatar from '@/components/ui/Avatar'
import ImageUpload from '@/components/ui/ImageUpload'
import { Plus, Edit2, Trash2, Search, MapPin, Phone, Eye, KeyRound, Copy, Check, ShieldOff, Ban, CheckCircle2, Clock } from 'lucide-react'

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

  // Pending follow-ups: unresolved skips across the whole org.
  // Polled every 2 min — not as hot as the salesman route, but admin
  // needs a reasonably fresh picture of what needs follow-up today.
  const { data: pendingSkips = [], refetch: refetchSkips } = useQuery({
    queryKey: ['pending-skips'],
    queryFn: () => skippedVisitApi.getAll({ resolved: false }).then(r => r.data),
    staleTime: 2 * 60 * 1000,
  })

  // shopId → skip[] map for fast lookup in the shop card grid
  const pendingSkipMap = pendingSkips.reduce((acc, sk) => {
    if (!acc[sk.shop.id]) acc[sk.shop.id] = []
    acc[sk.shop.id].push(sk)
    return acc
  }, {})

  // Skip records for the shop currently open in the view modal
  const { data: shopSkips = [], refetch: refetchShopSkips } = useQuery({
    queryKey: ['shop-skips', viewModal?.id],
    queryFn: () => skippedVisitApi.getAll({ shopId: viewModal.id }).then(r => r.data),
    enabled: !!viewModal,
    staleTime: 60 * 1000,
  })

  const resolveSkipM = useMutation({
    mutationFn: (id) => skippedVisitApi.resolve(id),
    onSuccess: () => {
      toast.success('Marked as resolved')
      refetchSkips()
      refetchShopSkips()
    },
    onError: e => toast.error(getErrorMessage(e)),
  })

  const createM = useMutation({ mutationFn: shopApi.create, onSuccess: () => { toast.success('Shop added!'); qc.invalidateQueries(['shops']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const updateM = useMutation({ mutationFn: ({ id, ...d }) => shopApi.update(id, d), onSuccess: () => { toast.success('Shop updated!'); qc.invalidateQueries(['shops']); setModal(null) }, onError: e => toast.error(getErrorMessage(e)) })
  const deleteM = useMutation({ mutationFn: (id) => shopApi.delete(id), onSuccess: () => { toast.success('Shop removed'); qc.invalidateQueries(['shops']); setDelConfirm(null) }, onError: e => toast.error(getErrorMessage(e)) })

  const [revealedCreds, setRevealedCreds] = useState(null) // { code, password } — shown exactly once
  const generateCredsM = useMutation({
    mutationFn: (shop) => shopApi.generatePortalCredentials(shop.id),
    onSuccess: (res, shop) => {
      setRevealedCreds({ ...res.data, shopPhone: shop.phone })
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

  const SKIP_LABELS = { SHOP_CLOSED: 'Closed 🔒', OWNER_UNAVAILABLE: 'Owner Away 👤', PAYMENT_DISPUTE: 'Payment Issue 💸', OTHER: 'Other 📝' }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Shops</h1><p className="text-gray-500 text-sm">{shops.length} registered shops</p></div>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Add Shop</button>
      </div>

      {/* Pending Follow-Ups banner */}
      {pendingSkips.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Ban className="w-4 h-4 text-orange-600" />
            <h3 className="font-semibold text-orange-800 text-sm">
              {pendingSkips.length} shop{pendingSkips.length > 1 ? 's' : ''} need follow-up
            </h3>
            <span className="text-xs text-orange-500 ml-auto flex items-center gap-1">
              <Clock className="w-3 h-3" /> Click a shop below to resolve
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {pendingSkips.slice(0, 8).map(sk => (
              <button
                key={sk.id}
                onClick={() => setViewModal(shops.find(s => s.id === sk.shop.id) || sk.shop)}
                className="flex items-center gap-1.5 bg-white border border-orange-200 rounded-xl px-3 py-1.5 text-xs hover:border-orange-400 transition-colors"
              >
                <span className="font-semibold text-gray-800">{sk.shop.name}</span>
                <span className="text-orange-500">{SKIP_LABELS[sk.reason]}</span>
              </button>
            ))}
            {pendingSkips.length > 8 && (
              <span className="text-xs text-orange-500 self-center">+{pendingSkips.length - 8} more</span>
            )}
          </div>
        </div>
      )}

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
          {shops.map(s => {
            const shopSkipCount = pendingSkipMap[s.id]?.length || 0
            return (
            <div key={s.id} className={`card p-5 hover:shadow-md transition-shadow ${shopSkipCount > 0 ? 'border-orange-200' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Avatar src={s.ownerPhoto} name={s.ownerName} size="md" />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{s.name}</h3>
                      {shopSkipCount > 0 && (
                        <span className="bg-orange-100 text-orange-700 text-[11px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                          <Ban className="w-2.5 h-2.5" />{shopSkipCount} skip
                        </span>
                      )}
                    </div>
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
            )
          })}
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
                  onClick={() => generateCredsM.mutate(viewModal)}
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

            {/* Skipped Visit History */}
            {shopSkips.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Ban className="w-4 h-4 text-orange-500" /> Skipped Visits
                  {shopSkips.filter(s => !s.isResolved).length > 0 && (
                    <span className="bg-orange-100 text-orange-700 text-[11px] px-2 py-0.5 rounded-full font-semibold">
                      {shopSkips.filter(s => !s.isResolved).length} pending
                    </span>
                  )}
                </h3>
                <div className="space-y-2">
                  {shopSkips.slice(0, 10).map(sk => (
                    <div
                      key={sk.id}
                      className={`flex items-start justify-between rounded-xl px-3 py-2.5 text-sm border ${
                        sk.isResolved ? 'bg-gray-50 border-gray-100' : 'bg-orange-50 border-orange-100'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`font-medium ${sk.isResolved ? 'text-gray-500' : 'text-orange-800'}`}>
                            {SKIP_LABELS[sk.reason] || sk.reason}
                          </span>
                          <span className="text-xs text-gray-400">by {sk.salesman?.name}</span>
                        </div>
                        {sk.notes && <p className="text-xs text-gray-500 mt-0.5 truncate">{sk.notes}</p>}
                        <p className="text-xs text-gray-400 mt-0.5">{new Date(sk.skippedDate).toLocaleDateString('en-PK', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                      </div>
                      {sk.isResolved ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium ml-3 flex-shrink-0">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Resolved
                        </span>
                      ) : (
                        <button
                          onClick={() => resolveSkipM.mutate(sk.id)}
                          disabled={resolveSkipM.isPending}
                          className="ml-3 flex-shrink-0 text-xs bg-white border border-orange-200 text-orange-700 hover:bg-orange-100 px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                          Resolve
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
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

      {/* ── Portal Credentials Modal ───────────────────────────────── */}
      <Modal open={!!revealedCreds} onClose={() => setRevealedCreds(null)} title="Portal Access Ready" size="md">
        {revealedCreds && (
          <div className="space-y-5">
            {/* Warning banner */}
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-3">
              <span className="text-amber-500 text-lg flex-shrink-0">⚠️</span>
              <p className="text-sm text-amber-800">
                <strong>Password dikhta hai sirf abhi.</strong> Shop owner ko abhi share kar do — reset karne se naya password generate hoga.
              </p>
            </div>

            {/* Portal URL */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Portal Link</p>
              <CredentialField
                label=""
                value={typeof window !== 'undefined'
                  ? `${window.location.origin}/shop-portal/login`
                  : '/shop-portal/login'}
                mono={false}
              />
            </div>

            {/* Code + Password side by side */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Portal Code</p>
                <CredentialField label="" value={revealedCreds.code} />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase mb-1.5">Password (one-time)</p>
                <CredentialField label="" value={revealedCreds.password} />
              </div>
            </div>

            {/* WhatsApp share button */}
            <a
              href={`https://wa.me/${(revealedCreds.shopPhone || '').replace(/\D/g, '')}?text=${encodeURIComponent(
                `Assalam-o-Alaikum!\n\nApka *Franchise Manager* portal access ready hai:\n\n🔗 Link: ${typeof window !== 'undefined' ? window.location.origin : ''}/shop-portal/login\n📋 Code: *${revealedCreds.code}*\n🔑 Password: *${revealedCreds.password}*\n\nLogin karen aur apna account dekhen.`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2.5 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                <path d="M12 0C5.373 0 0 5.373 0 12c0 2.127.558 4.126 1.535 5.858L.057 23.805a.5.5 0 0 0 .61.637l6.154-1.615A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.808 9.808 0 0 1-5.032-1.388l-.36-.214-3.733.979 1.001-3.64-.236-.374A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
              </svg>
              WhatsApp par bhejo
            </a>

            {/* Step by step guide */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Shop Owner Login Steps</p>
              <ol className="space-y-2">
                {[
                  'Upar wala link browser mein kholen',
                  `Portal Code dalein: ${revealedCreds.code}`,
                  'Password dalein (jo upar diya gaya hai)',
                  'Login ho jayenge — apna account dekhein',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                    <span className="bg-indigo-100 text-indigo-700 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">{i + 1}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>

            <button onClick={() => setRevealedCreds(null)} className="btn-primary w-full">
              Credentials save kar liye ✓
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}

function CredentialField({ label, value, mono = true }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className={label ? 'mb-3' : ''}>
      {label && <label className="label">{label}</label>}
      <div className="flex items-center gap-2">
        <code className={`flex-1 bg-gray-100 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 break-all ${mono ? 'font-mono' : ''}`}>
          {value}
        </code>
        <button onClick={copy} className="btn-secondary px-3 py-2 flex-shrink-0">
          {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}

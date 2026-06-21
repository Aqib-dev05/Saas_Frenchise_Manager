'use client'
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { productApi } from '@/lib/api'
import { formatCurrency, getErrorMessage } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Plus, Edit2, Trash2, Search, AlertTriangle, Package } from 'lucide-react'

function ProductForm({ defaultValues, onSubmit, loading }) {
  const { register, handleSubmit, formState: { errors } } = useForm({ defaultValues })
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2"><label className="label">Product Name *</label>
          <input className="input" {...register('name', { required: true })} />{errors.name && <p className="text-red-500 text-xs mt-1">Required</p>}</div>
        <div><label className="label">SKU *</label><input className="input" {...register('sku', { required: true })} /></div>
        <div><label className="label">Category *</label><input className="input" {...register('category', { required: true })} /></div>
        <div><label className="label">Selling Price (Rs.) *</label><input className="input" type="number" step="0.01" {...register('price', { required: true })} /></div>
        <div><label className="label">Cost Price (Rs.)</label><input className="input" type="number" step="0.01" {...register('costPrice')} /></div>
        <div><label className="label">Stock Qty</label><input className="input" type="number" {...register('stock')} /></div>
        <div><label className="label">Min Stock Alert</label><input className="input" type="number" {...register('minStock')} /></div>
        <div><label className="label">Unit</label>
          <select className="input" {...register('unit')}>
            {['piece','bottle','pack','bag','box','kg','liter','dozen'].map(u => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="label">Description</label><textarea className="input resize-none" rows={2} {...register('description')} /></div>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? 'Saving...' : 'Save Product'}</button>
      </div>
    </form>
  )
}

export default function ProductsPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null) // null | 'create' | { product }
  const [delConfirm, setDelConfirm] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['products', search],
    queryFn: () => productApi.getAll({ search, limit: 200 }).then(r => r.data),
  })

  const createMutation = useMutation({
    mutationFn: (d) => productApi.create(d),
    onSuccess: () => { toast.success('Product created!'); qc.invalidateQueries(['products']); setModal(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }) => productApi.update(id, d),
    onSuccess: () => { toast.success('Product updated!'); qc.invalidateQueries(['products']); setModal(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })
  const deleteMutation = useMutation({
    mutationFn: (id) => productApi.delete(id),
    onSuccess: () => { toast.success('Product removed'); qc.invalidateQueries(['products']); setDelConfirm(null) },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const products = data?.products || []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Products</h1><p className="text-gray-500 text-sm">{products.length} products</p></div>
        <button onClick={() => setModal('create')} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" />Add Product</button>
      </div>

      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input className="input pl-9" placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {isLoading ? <LoadingSpinner /> : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500 uppercase font-semibold">
              <th className="text-left px-4 py-3">Product</th>
              <th className="text-left px-4 py-3">SKU</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-right px-4 py-3">Price</th>
              <th className="text-right px-4 py-3">Stock</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-indigo-600" /></div>
                      <span className="font-medium text-gray-900">{p.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500 font-mono text-xs">{p.sku}</td>
                  <td className="px-4 py-3"><span className="badge-gray">{p.category}</span></td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(p.price)}</td>
                  <td className="px-4 py-3 text-right">
                    <span className={`font-semibold ${p.isLowStock ? 'text-red-600' : 'text-gray-700'}`}>{p.stock}</span>
                    <span className="text-gray-400 text-xs ml-1">{p.unit}s</span>
                    {p.isLowStock && <AlertTriangle className="inline w-3 h-3 text-red-500 ml-1" />}
                  </td>
                  <td className="px-4 py-3">
                    {p.isLowStock ? <span className="badge-red">Low Stock</span> : <span className="badge-green">In Stock</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      <button onClick={() => setModal(p)} className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => setDelConfirm(p)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={!!modal} onClose={() => setModal(null)} title={modal === 'create' ? 'Add Product' : 'Edit Product'} size="md">
        <ProductForm
          defaultValues={modal && modal !== 'create' ? modal : { unit: 'piece', stock: 0, minStock: 10 }}
          onSubmit={(d) => modal === 'create' ? createMutation.mutate(d) : updateMutation.mutate({ id: modal.id, ...d })}
          loading={createMutation.isPending || updateMutation.isPending}
        />
      </Modal>

      <Modal open={!!delConfirm} onClose={() => setDelConfirm(null)} title="Remove Product" size="sm">
        <p className="text-gray-600 mb-6">Remove <strong>{delConfirm?.name}</strong>? This will deactivate it from orders.</p>
        <div className="flex gap-3">
          <button onClick={() => setDelConfirm(null)} className="btn-secondary flex-1">Cancel</button>
          <button onClick={() => deleteMutation.mutate(delConfirm.id)} disabled={deleteMutation.isPending} className="btn-danger flex-1">{deleteMutation.isPending ? 'Removing...' : 'Remove'}</button>
        </div>
      </Modal>
    </div>
  )
}
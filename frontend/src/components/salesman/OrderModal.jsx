'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { productApi, orderApi, invoiceApi } from '@/lib/api'
import { formatCurrency, getErrorMessage, downloadBlob } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { Plus, Trash2, ShoppingCart, Package, AlertTriangle, Download } from 'lucide-react'

export default function OrderModal({ routeShop, routeId, open, onClose, onSuccess }) {
  const qc = useQueryClient()
  const shop = routeShop?.shop
  const existingOrder = routeShop?.todayOrder
  const isEditing = !!existingOrder && existingOrder.status === 'PENDING'

  const pdfM = useMutation({
    mutationFn: () => invoiceApi.downloadPdf(existingOrder.id),
    onSuccess: (res) => downloadBlob(res.data, `${existingOrder?.invoice?.invoiceNo || existingOrder.orderNo}.pdf`),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-lookup-order'],
    queryFn: () => productApi.getLookup({ limit: 500 }).then(r => r.data),
    enabled: open,
  })

  const products = productsData?.products || []

  const { register, control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { notes: '', items: [{ productId: '', quantity: 1 }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  // Pre-fill form if editing existing order
  useEffect(() => {
    if (open && existingOrder) {
      reset({
        notes: existingOrder.notes || '',
        items: existingOrder.items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
      })
    } else if (open) {
      reset({ notes: '', items: [{ productId: '', quantity: 1 }] })
    }
  }, [open, existingOrder])

  const createM = useMutation({
    mutationFn: (data) => orderApi.create({ ...data, shopId: shop.id, routeId }),
    onSuccess: () => { toast.success('Order booked! ✓'); qc.invalidateQueries(['today-routes']); onSuccess?.(); onClose() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const updateM = useMutation({
    mutationFn: (data) => orderApi.update(existingOrder.id, data),
    onSuccess: () => { toast.success('Order updated!'); qc.invalidateQueries(['today-routes']); onSuccess?.(); onClose() },
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const getProductById = (id) => products.find(p => p.id === id)

  const calcTotal = () => watchedItems.reduce((sum, item) => {
    const p = getProductById(item.productId)
    return sum + (p ? Number(p.price) * Number(item.quantity || 0) : 0)
  }, 0)

  const onSubmit = (data) => {
    const validItems = data.items.filter(i => i.productId && Number(i.quantity) > 0)
    if (validItems.length === 0) { toast.error('Add at least one product'); return }
    const payload = { ...data, items: validItems }
    isEditing ? updateM.mutate(payload) : createM.mutate(payload)
  }

  if (!shop) return null

  return (
    <Modal open={open} onClose={onClose} title="" size="lg">
      <div className="space-y-5">
        {/* Shop header */}
        <div className="flex items-start justify-between bg-slate-50 rounded-xl p-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{shop.name}</h2>
            <p className="text-gray-500 text-sm">{shop.ownerName} · <a href={`tel:${shop.phone}`} className="text-indigo-600 hover:underline">{shop.phone}</a></p>
            <p className="text-gray-400 text-xs mt-1">{shop.address}</p>
          </div>
          <div className="text-right">
            <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold mb-2 ${
              shop.type === 'CREDIT' ? 'bg-orange-100 text-orange-700' :
              shop.type === 'WHOLESALE' ? 'bg-blue-100 text-blue-700' :
              shop.type === 'CASH' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}>{shop.type}</span>
            {parseFloat(shop.balance) > 0 && (
              <div className="flex items-center gap-1 text-orange-600">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span className="text-sm font-semibold">{formatCurrency(shop.balance)} due</span>
              </div>
            )}
          </div>
        </div>

        {/* Already booked and not editable */}
        {existingOrder && existingOrder.status !== 'PENDING' && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-700 font-semibold text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Order already placed — {existingOrder.status}
                </p>
                <p className="text-emerald-600 text-xs mt-1">
                  {existingOrder.orderNo} · {formatCurrency(existingOrder.totalAmount)} · {existingOrder.items.length} items
                </p>
              </div>
              {existingOrder.invoice && (
                <button
                  type="button"
                  onClick={() => pdfM.mutate()}
                  disabled={pdfM.isPending}
                  title="Download invoice PDF"
                  className="flex items-center gap-1.5 text-xs bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 disabled:opacity-50 shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />{pdfM.isPending ? 'Loading…' : 'Invoice'}
                </button>
              )}
            </div>
            <div className="mt-3 space-y-1">
              {existingOrder.items.map(item => (
                <div key={item.id} className="flex justify-between text-xs text-emerald-700">
                  <span>{item.product?.name} × {item.quantity}</span>
                  <span>{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order form */}
        {(!existingOrder || isEditing) && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Order Items</h3>
                <button type="button" onClick={() => append({ productId: '', quantity: 1 })}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {fields.map((field, idx) => {
                const selectedProduct = getProductById(watchedItems[idx]?.productId)
                return (
                  <div key={field.id} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <select className="input text-sm"
                        {...register(`items.${idx}.productId`, { required: true })}>
                        <option value="">Select product...</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id} disabled={p.stock === 0}>
                            {p.name} — {formatCurrency(p.price)}/{p.unit} {p.isLowStock ? '⚠' : ''} (Stock: {p.stock})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="w-24">
                      <input type="number" min="1"
                        className="input text-sm text-center"
                        placeholder="Qty"
                        {...register(`items.${idx}.quantity`, { required: true, min: 1 })}
                      />
                    </div>
                    <div className="w-28 text-right pt-2">
                      {selectedProduct ? (
                        <span className="text-sm font-semibold text-indigo-600">
                          {formatCurrency(Number(selectedProduct.price) * Number(watchedItems[idx]?.quantity || 0))}
                        </span>
                      ) : <span className="text-gray-300 text-sm">—</span>}
                    </div>
                    <button type="button" onClick={() => fields.length > 1 && remove(idx)}
                      disabled={fields.length === 1}
                      className="mt-1.5 text-gray-300 hover:text-red-500 transition-colors disabled:cursor-not-allowed">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })}
            </div>

            {/* Total */}
            <div className="flex justify-between items-center pt-3 border-t border-gray-100">
              <span className="font-semibold text-gray-700">Order Total</span>
              <span className="text-xl font-bold text-indigo-600">{formatCurrency(calcTotal())}</span>
            </div>

            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input resize-none" rows={2} placeholder="Any special instructions..."
                {...register('notes')} />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button type="submit"
                disabled={createM.isPending || updateM.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                {createM.isPending || updateM.isPending
                  ? 'Booking...'
                  : isEditing ? 'Update Order' : 'Book Order'}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}

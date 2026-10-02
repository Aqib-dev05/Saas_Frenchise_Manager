'use client'
import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import { productApi, orderApi, invoiceApi, billApi } from '@/lib/api'
import { formatCurrency, getErrorMessage, downloadBlob } from '@/lib/utils'
import Modal from '@/components/ui/Modal'
import { Plus, Trash2, ShoppingCart, AlertTriangle, Download, Tag } from 'lucide-react'

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

  const billM = useMutation({
    mutationFn: () => billApi.download(existingOrder.id),
    onSuccess: (res) => downloadBlob(res.data, `bill-${existingOrder.orderNo}.pdf`),
    onError: (e) => toast.error(getErrorMessage(e)),
  })

  const { data: productsData } = useQuery({
    queryKey: ['products-lookup-order'],
    queryFn: () => productApi.getLookup({ limit: 500 }).then(r => r.data),
    enabled: open,
  })

  const products = productsData?.products || []
  const getProductById = (id) => products.find(p => p.id === id)

  const { register, control, handleSubmit, watch, setValue, reset } = useForm({
    defaultValues: { notes: '', items: [{ productId: '', quantity: 1, price: '' }] },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'items' })
  const watchedItems = watch('items')

  // Pre-fill form when modal opens
  useEffect(() => {
    if (open && isEditing && existingOrder) {
      reset({
        notes: existingOrder.notes || '',
        items: existingOrder.items.map(i => ({
          productId: i.productId,
          quantity: i.quantity,
          price: Number(i.price).toFixed(2),  // pre-fill with the saved per-shop price
        })),
      })
    } else if (open && !existingOrder) {
      reset({ notes: '', items: [{ productId: '', quantity: 1, price: '' }] })
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

  // Total uses the entered price per row (not base price) so the salesman
  // sees exactly what will be invoiced before submitting.
  const calcTotal = () => watchedItems.reduce((sum, item) => {
    const price = Number(item.price) || Number(getProductById(item.productId)?.price || 0)
    return sum + price * Number(item.quantity || 0)
  }, 0)

  const onSubmit = (data) => {
    const validItems = data.items
      .filter(i => i.productId && Number(i.quantity) > 0)
      .map(i => ({
        productId: i.productId,
        quantity: Number(i.quantity),
        // Send price only when the salesman explicitly entered one.
        // Backend falls back to product base price when price is absent/0.
        price: Number(i.price) > 0 ? Number(i.price) : undefined,
      }))
    if (validItems.length === 0) { toast.error('Add at least one product'); return }
    isEditing ? updateM.mutate({ ...data, items: validItems }) : createM.mutate({ ...data, items: validItems })
  }

  if (!shop) return null

  return (
    <Modal open={open} onClose={onClose} title="" size="lg">
      <div className="space-y-5">

        {/* Shop header */}
        <div className="flex items-start justify-between bg-slate-50 rounded-xl p-4">
          <div>
            <h2 className="font-bold text-gray-900 text-lg">{shop.name}</h2>
            <p className="text-gray-500 text-sm">
              {shop.ownerName} · <a href={`tel:${shop.phone}`} className="text-indigo-600 hover:underline">{shop.phone}</a>
            </p>
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

        {/* Already booked (non-editable) — show with unit price */}
        {existingOrder && !isEditing && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-emerald-700 font-semibold text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" /> Order placed — {existingOrder.status}
                </p>
                <p className="text-emerald-600 text-xs mt-1">
                  {existingOrder.orderNo} · {formatCurrency(existingOrder.totalAmount)} · {existingOrder.items.length} items
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {/* Bill — available on any status (PENDING onward) */}
                <button
                  type="button"
                  onClick={() => billM.mutate()}
                  disabled={billM.isPending}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-2.5 py-1.5 rounded-lg font-medium"
                >
                  <Download className="w-3.5 h-3.5" />{billM.isPending ? '...' : 'Bill'}
                </button>
                {/* Formal invoice PDF — only once invoice is generated (CONFIRMED+) */}
                {existingOrder.invoice && (
                  <button
                    type="button"
                    onClick={() => pdfM.mutate()}
                    disabled={pdfM.isPending}
                    className="flex items-center gap-1.5 text-xs bg-white border border-emerald-200 text-emerald-700 px-2.5 py-1.5 rounded-lg hover:bg-emerald-100 disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />{pdfM.isPending ? '...' : 'Invoice'}
                  </button>
                )}
              </div>
            </div>
            {/* Items with unit price visible */}
            <div className="mt-3 space-y-1">
              <div className="flex text-[11px] text-emerald-500 font-medium pb-1 border-b border-emerald-100">
                <span className="flex-1">Product</span>
                <span className="w-20 text-right">Rate</span>
                <span className="w-12 text-right">Qty</span>
                <span className="w-20 text-right">Amount</span>
              </div>
              {existingOrder.items.map(item => (
                <div key={item.id} className="flex items-center text-xs text-emerald-700">
                  <span className="flex-1 font-medium">{item.product?.name}</span>
                  <span className="w-20 text-right text-emerald-500">{formatCurrency(item.price)}</span>
                  <span className="w-12 text-right">×{item.quantity}</span>
                  <span className="w-20 text-right font-semibold">{formatCurrency(item.subtotal)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order form (create or edit PENDING) */}
        {(!existingOrder || isEditing) && (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Order Items</h3>
                <button
                  type="button"
                  onClick={() => append({ productId: '', quantity: 1, price: '' })}
                  className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Item
                </button>
              </div>

              {/* Column headers — desktop only; mobile rows are labeled inline via placeholders */}
              <div className="hidden sm:flex gap-2 text-[11px] text-gray-400 font-medium px-0.5">
                <div className="flex-1">Product</div>
                <div className="w-28">Rate (Rs.)</div>
                <div className="w-20">Qty</div>
                <div className="w-20 text-right">Subtotal</div>
                <div className="w-7" />
              </div>

              {fields.map((field, idx) => {
                const selectedProduct = getProductById(watchedItems[idx]?.productId)
                const enteredPrice = Number(watchedItems[idx]?.price)
                const basePrice = Number(selectedProduct?.price || 0)
                const isCustomPrice = selectedProduct && enteredPrice > 0 && enteredPrice !== basePrice
                const effectivePrice = enteredPrice > 0 ? enteredPrice : basePrice
                const subtotal = effectivePrice * Number(watchedItems[idx]?.quantity || 0)

                // Destructure RHF's register to intercept onChange for product select
                const { onChange: rhfProductChange, ...productRegisterRest } = register(`items.${idx}.productId`)

                return (
                  <div key={field.id} className="space-y-1">
                    <div className="flex flex-wrap gap-2 items-start">
                      {/* Product dropdown */}
                      <div className="w-full sm:flex-1">
                        <select
                          className="input text-sm"
                          {...productRegisterRest}
                          onChange={(e) => {
                            rhfProductChange(e)
                            // Auto-fill price with base price when product changes
                            const p = products.find(prod => prod.id === e.target.value)
                            if (p) setValue(`items.${idx}.price`, Number(p.price).toFixed(2))
                            else setValue(`items.${idx}.price`, '')
                          }}
                        >
                          <option value="">Select product...</option>
                          {products.map(p => (
                            <option key={p.id} value={p.id} disabled={p.stock === 0}>
                              {p.name} — Rs.{Number(p.price).toFixed(0)}/{p.unit}
                              {p.isLowStock ? ' ⚠' : ''} (Stock: {p.stock})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Price input */}
                      <div className="w-28">
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          className={`input text-sm text-right ${isCustomPrice ? 'border-amber-400 bg-amber-50 text-amber-800' : ''}`}
                          placeholder={basePrice > 0 ? basePrice.toFixed(2) : 'Rate'}
                          {...register(`items.${idx}.price`, { min: 0.01 })}
                        />
                      </div>

                      {/* Quantity */}
                      <div className="w-20">
                        <input
                          type="number"
                          min="1"
                          className="input text-sm text-center"
                          placeholder="Qty"
                          {...register(`items.${idx}.quantity`, { required: true, min: 1 })}
                        />
                      </div>

                      {/* Subtotal */}
                      <div className="w-20 text-right pt-2.5">
                        {selectedProduct && effectivePrice > 0 ? (
                          <span className={`text-sm font-semibold ${isCustomPrice ? 'text-amber-700' : 'text-indigo-600'}`}>
                            {formatCurrency(subtotal)}
                          </span>
                        ) : <span className="text-gray-300 text-sm">—</span>}
                      </div>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() => fields.length > 1 && remove(idx)}
                        disabled={fields.length === 1}
                        className="mt-2 text-gray-300 hover:text-red-500 transition-colors disabled:cursor-not-allowed w-7"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Custom price hint — only when price was manually changed */}
                    {isCustomPrice && (
                      <div className="flex items-center gap-1 pl-0.5 ml-0">
                        <Tag className="w-3 h-3 text-amber-500" />
                        <span className="text-[11px] text-amber-600">
                          Custom rate · Base price: {formatCurrency(basePrice)}
                        </span>
                      </div>
                    )}
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
              <textarea
                className="input resize-none"
                rows={2}
                placeholder="Any special instructions..."
                {...register('notes')}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
              <button
                type="submit"
                disabled={createM.isPending || updateM.isPending}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
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

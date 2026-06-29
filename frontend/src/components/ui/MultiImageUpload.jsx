'use client'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { uploadApi } from '@/lib/api'
import { getErrorMessage, optimizedImageUrl } from '@/lib/utils'
import { Camera, Loader2, ImageIcon, X } from 'lucide-react'

const MAX_SIZE_MB = 5

/**
 * Product photo uploader — fixed at MAX_IMAGES slots (default 2). Each slot
 * uploads independently; removing a slot just clears that index.
 *
 * Props:
 *  - value: array of image URLs, e.g. ['url1', 'url2'] (can be shorter than max)
 *  - onChange(urls): called with the updated array whenever a slot changes
 *  - folder: Cloudinary subfolder (default 'products')
 *  - max: maximum number of images (default 2)
 */
export default function MultiImageUpload({ value = [], onChange, folder = 'products', max = 2 }) {
  const [uploadingIdx, setUploadingIdx] = useState(null)
  const inputRefs = useRef([])

  const slots = Array.from({ length: max }, (_, i) => value[i] || null)

  const handleFile = async (idx, e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`)
      return
    }

    setUploadingIdx(idx)
    try {
      const res = await uploadApi.uploadImage(file, folder)
      const next = [...value]
      next[idx] = res.data.url
      onChange(next.filter(Boolean).slice(0, max))
      toast.success('Photo uploaded')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally {
      setUploadingIdx(null)
    }
  }

  const handleRemove = (idx) => {
    const next = [...value]
    next.splice(idx, 1)
    onChange(next)
  }

  return (
    <div>
      <div className="flex gap-3">
        {slots.map((url, idx) => (
          <div key={idx} className="relative">
            <div
              onClick={() => uploadingIdx === null && inputRefs.current[idx]?.click()}
              className="w-28 h-28 rounded-xl bg-slate-100 border-2 border-dashed border-gray-200 hover:border-indigo-400 flex items-center justify-center overflow-hidden cursor-pointer transition-colors group"
            >
              {url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={optimizedImageUrl(url)} alt={`product-${idx}`} className="w-full h-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-1 text-gray-300">
                  <ImageIcon className="w-6 h-6" />
                  <span className="text-[10px]">Image {idx + 1}</span>
                </div>
              )}

              {uploadingIdx === idx && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-white animate-spin" />
                </div>
              )}

              {url && uploadingIdx !== idx && (
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              <input
                ref={(el) => (inputRefs.current[idx] = el)}
                type="file"
                accept="image/*"
                onChange={(e) => handleFile(idx, e)}
                className="hidden"
              />
            </div>

            {url && (
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-gray-400 mt-2">Up to {max} images, JPG/PNG, max {MAX_SIZE_MB}MB each</p>
    </div>
  )
}

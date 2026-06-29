'use client'
import { useState, useRef } from 'react'
import toast from 'react-hot-toast'
import { uploadApi } from '@/lib/api'
import { getErrorMessage, optimizedImageUrl } from '@/lib/utils'
import { Camera, Loader2, ImageIcon } from 'lucide-react'

const MAX_SIZE_MB = 5

/**
 * Single profile-picture style uploader (1 image max).
 * Used for: user avatars, shop owner photos.
 *
 * Props:
 *  - value: current image URL (or '' / null)
 *  - onChange(url): called with the new Cloudinary URL after a successful upload,
 *                    or '' if the image is removed
 *  - folder: Cloudinary subfolder ('avatars' | 'shops')
 *  - shape: 'circle' | 'square'
 *  - size: 'sm' | 'md' | 'lg'
 */
export default function ImageUpload({ value, onChange, folder = 'general', shape = 'circle', size = 'md' }) {
  const [preview, setPreview] = useState(value || null)
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef(null)

  const sizes = { sm: 'w-16 h-16', md: 'w-24 h-24', lg: 'w-32 h-32' }
  const shapeClass = shape === 'circle' ? 'rounded-full' : 'rounded-xl'

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = '' // allow re-selecting the same file later
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      toast.error(`Image must be under ${MAX_SIZE_MB}MB`)
      return
    }

    const localUrl = URL.createObjectURL(file)
    setPreview(localUrl)
    setUploading(true)
    try {
      const res = await uploadApi.uploadImage(file, folder)
      onChange(res.data.url)
      setPreview(res.data.url)
      toast.success('Photo uploaded')
    } catch (err) {
      toast.error(getErrorMessage(err))
      setPreview(value || null)
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = (e) => {
    e.stopPropagation()
    setPreview(null)
    onChange('')
  }

  return (
    <div className="flex items-center gap-4">
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative ${sizes[size]} ${shapeClass} bg-slate-100 border-2 border-dashed border-gray-200 hover:border-indigo-400 flex items-center justify-center overflow-hidden cursor-pointer transition-colors group flex-shrink-0`}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview.startsWith('blob:') ? preview : optimizedImageUrl(preview)} alt="preview" className="w-full h-full object-cover" />
        ) : (
          <ImageIcon className="w-6 h-6 text-gray-300" />
        )}

        {uploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          </div>
        )}

        {!uploading && (
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
            <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}

        <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </div>

      <div className="flex flex-col gap-1">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium text-left">
          {preview ? 'Change photo' : 'Upload photo'}
        </button>
        {preview && (
          <button type="button" onClick={handleRemove} className="text-xs text-red-500 hover:text-red-600 text-left">
            Remove
          </button>
        )}
        <p className="text-xs text-gray-400">JPG, PNG up to {MAX_SIZE_MB}MB</p>
      </div>
    </div>
  )
}

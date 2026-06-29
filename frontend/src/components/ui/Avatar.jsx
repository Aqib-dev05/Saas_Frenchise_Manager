import { getInitials, optimizedImageUrl } from '@/lib/utils'

const SIZES = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
}

export default function Avatar({ src, name, size = 'md', className = '' }) {
  const sizeClass = SIZES[size] || SIZES.md

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={optimizedImageUrl(src)}
        alt={name || 'avatar'}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-gray-100 ${className}`}
      />
    )
  }

  return (
    <div className={`${sizeClass} rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold flex-shrink-0 ${className}`}>
      {getInitials(name)}
    </div>
  )
}

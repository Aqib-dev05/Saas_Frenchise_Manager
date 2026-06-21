import { Loader2 } from 'lucide-react'
export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      <p className="text-gray-400 text-sm">{text}</p>
    </div>
  )
}

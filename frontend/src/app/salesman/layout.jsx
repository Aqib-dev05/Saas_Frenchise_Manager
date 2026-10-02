'use client'
import { useSelector } from 'react-redux'
import { useRouter, usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { selectIsAuth, selectRole, selectIsHydrated } from '@/store/slices/authSlice'
import Sidebar from '@/components/Sidebar'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import { Menu } from 'lucide-react'

export default function SalesmanLayout({ children }) {
  const isHydrated = useSelector(selectIsHydrated)
  const isAuth = useSelector(selectIsAuth)
  const role = useSelector(selectRole)
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!isHydrated) return
    if (!isAuth) router.replace('/login')
    else if (role !== 'SALESMAN') router.replace(role === 'ADMIN' ? '/admin' : '/delivery')
  }, [isHydrated, isAuth, role])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (!isHydrated || !isAuth || role !== 'SALESMAN') return <LoadingSpinner text="Authenticating..." />

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen w-full min-w-0">
        <div className="lg:hidden flex items-center gap-3 bg-white border-b border-gray-100 px-4 py-3 flex-shrink-0 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-semibold text-gray-900 text-sm truncate">Franchise Manager</span>
        </div>
        <SubscriptionBanner />
        <main className="flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
    </div>
  )
}

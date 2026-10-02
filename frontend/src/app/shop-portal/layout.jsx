'use client'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Store, LogOut } from 'lucide-react'
import { ShopTypeBadge } from '@/components/ui/Badge'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function ShopPortalLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [shop, setShop] = useState(null)
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    if (pathname === '/shop-portal/login') { setChecked(true); return }
    const token = localStorage.getItem('fm_shop_token')
    const data = localStorage.getItem('fm_shop_data')
    if (!token || !data) {
      router.replace('/shop-portal/login')
      return
    }
    try { setShop(JSON.parse(data)) } catch { /* corrupted cache, treat as logged out */ }
    setChecked(true)
  }, [pathname, router])

  const logout = () => {
    localStorage.removeItem('fm_shop_token')
    localStorage.removeItem('fm_shop_data')
    router.replace('/shop-portal/login')
  }

  if (pathname === '/shop-portal/login') return children

  if (!checked) return <div className="min-h-screen flex items-center justify-center"><LoadingSpinner /></div>

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 text-sm leading-tight truncate">{shop?.name || 'Shop Portal'}</p>
              {shop?.type && <ShopTypeBadge type={shop.type} />}
            </div>
          </div>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 flex-shrink-0">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}

'use client'
import { useSelector } from 'react-redux'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { selectIsAuth, selectRole, selectIsHydrated } from '@/store/slices/authSlice'
import Sidebar from '@/components/Sidebar'
import SubscriptionBanner from '@/components/SubscriptionBanner'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

export default function DeliveryLayout({ children }) {
  const isHydrated = useSelector(selectIsHydrated)
  const isAuth = useSelector(selectIsAuth)
  const role = useSelector(selectRole)
  const router = useRouter()

  useEffect(() => {
    if (!isHydrated) return
    if (!isAuth) router.replace('/login')
    else if (role !== 'DELIVERY') router.replace(role === 'ADMIN' ? '/admin' : '/salesman')
  }, [isHydrated, isAuth, role])

  if (!isHydrated || !isAuth || role !== 'DELIVERY') return <LoadingSpinner text="Authenticating..." />

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar />
      <div className="flex-1 ml-60 flex flex-col min-h-screen">
        <SubscriptionBanner />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  )
}
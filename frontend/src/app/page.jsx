'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { selectIsAuth, selectRole, selectIsHydrated } from '@/store/slices/authSlice'

export default function RootPage() {
  const isHydrated = useSelector(selectIsHydrated)
  const isAuth = useSelector(selectIsAuth)
  const role = useSelector(selectRole)
  const router = useRouter()

  useEffect(() => {
    if (!isHydrated) return
    if (isAuth) {
      if (role === 'ADMIN') router.replace('/admin')
      else if (role === 'SALESMAN') router.replace('/salesman')
      else if (role === 'DELIVERY') router.replace('/delivery')
    } else {
      router.replace('/landing')
    }
  }, [isHydrated, isAuth, role])

  return null
}

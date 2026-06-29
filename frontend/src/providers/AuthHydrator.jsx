'use client'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { hydrateAuth } from '@/store/slices/authSlice'

export default function AuthHydrator() {
  const dispatch = useDispatch()
  useEffect(() => {
    dispatch(hydrateAuth())
  }, [dispatch])
  return null
}

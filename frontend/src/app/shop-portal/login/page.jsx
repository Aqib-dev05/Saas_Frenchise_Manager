'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Store, Eye, EyeOff, Loader2 } from 'lucide-react'
import { shopPortalAuthApi } from '@/lib/shopPortalApi'
import { getErrorMessage } from '@/lib/utils'

export default function ShopPortalLoginPage() {
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async ({ code, password }) => {
    setLoading(true)
    try {
      const res = await shopPortalAuthApi.login(code, password)
      localStorage.setItem('fm_shop_token', res.data.token)
      localStorage.setItem('fm_shop_data', JSON.stringify(res.data.shop))
      toast.success(`Welcome, ${res.data.shop.name}!`)
      router.push('/shop-portal')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center">
              <Store className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">Shop Portal</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Shop Owner Login</h1>
          <p className="text-gray-500 mt-1 text-sm">View your orders, payments &amp; balance</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Portal Code</label>
              <input
                className="input uppercase tracking-wide font-mono"
                placeholder="SHOP-XXXXXX"
                {...register('code', { required: 'Portal code required' })}
              />
              {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
              <p className="text-xs text-gray-400 mt-1">Given to you by your distributor</p>
            </div>
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} placeholder="••••••••"
                  {...register('password', { required: 'Password required' })} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>
            <button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Lost your portal code or password? Contact your distributor.
        </p>
      </div>
    </div>
  )
}

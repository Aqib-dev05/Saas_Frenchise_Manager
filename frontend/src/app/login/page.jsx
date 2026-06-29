'use client'
import { useState } from 'react'
import { useDispatch } from 'react-redux'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Package, Eye, EyeOff, Loader2 } from 'lucide-react'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

export default function LoginPage() {
  const dispatch = useDispatch()
  const router = useRouter()
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, formState: { errors } } = useForm()

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authApi.login(data)
      dispatch(setCredentials(res.data))
      const role = res.data.user.role
      toast.success(`Welcome back, ${res.data.user.name}!`)
      if (role === 'ADMIN') router.push('/admin')
      else if (role === 'SALESMAN') router.push('/salesman')
      else router.push('/delivery')
    } catch (err) {
      const msg = getErrorMessage(err)
      if (err.response?.data?.code === 'TRIAL_EXPIRED') {
        toast.error('Trial expired! Please upgrade your plan.')
      } else {
        toast.error(msg)
      }
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">FranchiseManager</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input className="input" type="email" placeholder="you@company.com"
                {...register('email', { required: 'Email required' })} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="label">Password</label>
                <Link href="/forgot-password" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mb-1">Forgot password?</Link>
              </div>
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

          <div className="mt-6 p-4 bg-slate-50 rounded-xl text-xs text-gray-500 space-y-1">
            <p className="font-semibold text-gray-700 mb-2">Demo credentials:</p>
            <p>Admin: <span className="font-mono text-indigo-600">admin@demo-franchise.com</span> / admin123</p>
            <p>Salesman: <span className="font-mono text-indigo-600">salesman1@demo-franchise.com</span> / salesman123</p>
            <p>Delivery: <span className="font-mono text-indigo-600">delivery@demo-franchise.com</span> / delivery123</p>
          </div>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-indigo-600 hover:text-indigo-700 font-medium">Start free trial</Link>
        </p>
      </div>
    </div>
  )
}

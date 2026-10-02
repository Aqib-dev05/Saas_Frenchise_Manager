'use client'
import { useState, Suspense } from 'react'
import { useDispatch } from 'react-redux'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Package, Eye, EyeOff, Loader2, Check } from 'lucide-react'
import { setCredentials } from '@/store/slices/authSlice'
import { authApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

const PLAN_LABELS = { starter: 'Starter — $19/mo', professional: 'Professional — $49/mo', enterprise: 'Enterprise — $99/mo' }

function RegisterForm() {
  const dispatch = useDispatch()
  const router = useRouter()
  const params = useSearchParams()
  const selectedPlan = params.get('plan') || 'professional'
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { register, handleSubmit, watch, formState: { errors } } = useForm({ defaultValues: { plan: selectedPlan } })

  const onSubmit = async (data) => {
    setLoading(true)
    try {
      const res = await authApi.register({
        orgName: data.orgName, adminName: data.adminName,
        email: data.email, password: data.password, phone: data.phone,
      })
      dispatch(setCredentials(res.data))
      toast.success('Account created! Welcome to FranchiseManager 🎉')
      router.push('/admin')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Link href="/landing" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
              <Package className="w-6 h-6 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">FranchiseManager</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Start your free trial</h1>
          <p className="text-gray-500 mt-1 text-sm">14 days free · No credit card required</p>
        </div>

        {/* Selected plan badge */}
        {selectedPlan && (
          <div className="flex items-center justify-center gap-2 mb-5">
            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 text-sm font-medium px-4 py-1.5 rounded-full">
              <Check className="w-4 h-4" /> {PLAN_LABELS[selectedPlan] || 'Professional plan'} selected
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Company / Franchise Name <span className="text-red-500">*</span></label>
              <input className="input" placeholder="e.g. Lahore Coca-Cola Distribution"
                {...register('orgName', { required: 'Company name is required' })} />
              {errors.orgName && <p className="text-red-500 text-xs mt-1">{errors.orgName.message}</p>}
            </div>
            <div>
              <label className="label">Your Full Name <span className="text-red-500">*</span></label>
              <input className="input" placeholder="Muhammad Ali"
                {...register('adminName', { required: 'Your name is required' })} />
              {errors.adminName && <p className="text-red-500 text-xs mt-1">{errors.adminName.message}</p>}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Email <span className="text-red-500">*</span></label>
                <input className="input" type="email" placeholder="admin@company.com"
                  {...register('email', { required: 'Email required', pattern: { value: /^\S+@\S+$/, message: 'Invalid email' } })} />
                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" placeholder="0300-1234567"
                  {...register('phone')} />
              </div>
            </div>
            <div>
              <label className="label">Password <span className="text-red-500">*</span></label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} placeholder="Min 8 characters"
                  {...register('password', { required: 'Password required', minLength: { value: 8, message: 'At least 8 characters' } })} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="bg-indigo-50 rounded-xl p-4 flex items-start gap-3 mt-2">
              <Check className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-indigo-700">
                You get <strong>14 days free</strong> on the Professional plan. After trial, choose any plan. No charge until then.
              </p>
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating account...</> : 'Create Free Account →'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-indigo-600 font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterForm />
    </Suspense>
  )
}

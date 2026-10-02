'use client'
import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Package, Loader2, ArrowLeft, Eye, EyeOff, KeyRound } from 'lucide-react'
import { authApi } from '@/lib/api'
import { getErrorMessage } from '@/lib/utils'

const RESEND_COOLDOWN_SECONDS = 60

function ResetPasswordForm() {
  const router = useRouter()
  const params = useSearchParams()
  const emailFromQuery = params.get('email') || ''
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [showPass, setShowPass] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { email: emailFromQuery },
  })
  const newPassword = watch('newPassword')

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const onSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await authApi.resetPassword({ email: data.email, otp: data.otp, newPassword: data.newPassword })
      toast.success('Password reset! Please sign in.')
      router.push('/login')
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setLoading(false) }
  }

  const handleResend = async () => {
    const email = document.getElementById('reset-email-input')?.value || emailFromQuery
    if (!email) { toast.error('Enter your email first'); return }
    setResending(true)
    try {
      await authApi.forgotPassword({ email })
      toast.success('New code sent!')
      setCooldown(RESEND_COOLDOWN_SECONDS)
    } catch (err) {
      toast.error(getErrorMessage(err))
    } finally { setResending(false) }
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
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <KeyRound className="w-6 h-6 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Enter reset code</h1>
          <p className="text-gray-500 mt-1 text-sm">We sent a 6-digit code to your email. It expires in 10 minutes.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 sm:p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Email address</label>
              <input id="reset-email-input" className="input" type="email" placeholder="you@company.com"
                {...register('email', { required: 'Email required' })} />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="label">6-digit code</label>
              <input className="input text-center text-2xl font-bold tracking-[0.5em]" maxLength={6} placeholder="------"
                {...register('otp', { required: 'Code required', minLength: { value: 6, message: 'Enter all 6 digits' } })} />
              {errors.otp && <p className="text-red-500 text-xs mt-1">{errors.otp.message}</p>}
              <button type="button" onClick={handleResend} disabled={resending || cooldown > 0}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2 disabled:text-gray-400 disabled:cursor-not-allowed">
                {cooldown > 0 ? `Resend code in ${cooldown}s` : resending ? 'Sending...' : 'Resend code'}
              </button>
            </div>

            <div>
              <label className="label">New password</label>
              <div className="relative">
                <input className="input pr-10" type={showPass ? 'text' : 'password'} placeholder="Min 8 characters"
                  {...register('newPassword', { required: 'Password required', minLength: { value: 8, message: 'At least 8 characters' } })} />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.newPassword && <p className="text-red-500 text-xs mt-1">{errors.newPassword.message}</p>}
            </div>

            <div>
              <label className="label">Confirm new password</label>
              <input className="input" type={showPass ? 'text' : 'password'} placeholder="Re-enter password"
                {...register('confirmPassword', { required: 'Please confirm your password' })} />
              {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword.message}</p>}
              {newPassword && watch('confirmPassword') && newPassword !== watch('confirmPassword') && (
                <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
              )}
            </div>

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 flex items-center justify-center gap-2 text-base mt-2">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Resetting...</> : 'Reset Password'}
            </button>
          </form>
        </div>

        <Link href="/login" className="flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mt-6">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to login
        </Link>
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  )
}

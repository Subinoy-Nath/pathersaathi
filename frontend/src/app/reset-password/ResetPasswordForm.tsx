'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { completePasswordReset } from '@/app/auth/actions'

export default function ResetPasswordForm() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Password strength calculation
  const strength = useMemo(() => {
    if (!password) return { score: 0, label: '', color: 'bg-gray-200' }
    let score = 0
    if (password.length >= 8) score += 1
    if (/[A-Z]/.test(password)) score += 1
    if (/[0-9]/.test(password)) score += 1
    if (/[^A-Za-z0-9]/.test(password)) score += 1

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500', width: 'w-1/4' }
    if (score === 2) return { score: 2, label: 'Fair', color: 'bg-yellow-500', width: 'w-2/4' }
    if (score === 3) return { score: 3, label: 'Good', color: 'bg-blue-500', width: 'w-3/4' }
    return { score: 4, label: 'Strong', color: 'bg-green-500', width: 'w-full' }
  }, [password])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage('')

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.')
      return
    }

    setIsLoading(true)

    const formData = new FormData()
    formData.append('password', password)
    formData.append('confirm_password', confirmPassword)

    const result = await completePasswordReset(formData)

    setIsLoading(false)

    if (result.success) {
      router.push('/?message=' + encodeURIComponent('Password reset successfully! Welcome back.'))
    } else {
      setErrorMessage(result.error || 'Failed to update password. Please try again.')
    }
  }

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-start p-4 pt-20 md:pt-24 pb-12 relative w-full text-[#191c1d]">
      {/* Abstract Background Elements */}
      <div className="map-pattern"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[400px] h-[400px] bg-[#00affe]/20 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-[300px] h-[300px] bg-[#afefdd]/10 rounded-full blur-[80px]"></div>

      {/* Logo Section */}
      <div className="relative z-10 mb-8 animate-fade-in flex justify-center">
        <Image
          alt="Pather Saathi Logo"
          width={80}
          height={80}
          className="h-20 w-20 rounded-full drop-shadow-lg object-cover border-2 border-white/50"
          src="/images/logo.jpeg"
          unoptimized
        />
      </div>

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl shadow-[0_20px_50px_rgba(0,77,64,0.25)] overflow-hidden transition-all duration-300 p-8">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-extrabold text-[#00342b] tracking-tight">
            Set New Password
          </h1>
          <p className="text-xs font-semibold text-[#006493] mt-1">
            নতুন পাসওয়ার্ড সেট করুন
          </p>
          <p className="text-xs text-[#3f4945] mt-2 leading-relaxed">
            Please choose a strong password with at least 8 characters.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="new-password" className="block text-xs font-semibold text-[#3f4945] ml-1">
              New Password
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">
                lock
              </span>
              <input
                id="new-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium"
                placeholder="••••••••"
                required
                minLength={8}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3f4945] hover:text-[#00342b] transition"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {/* Strength Meter */}
            {password && (
              <div className="pt-1 space-y-1">
                <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full ${strength.color} ${strength.width} transition-all duration-300`}></div>
                </div>
                <div className="flex justify-between text-[11px] text-[#3f4945]">
                  <span>Strength: <strong className="text-[#00342b]">{strength.label}</strong></span>
                  <span>Min 8 characters</span>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="confirm-password" className="block text-xs font-semibold text-[#3f4945] ml-1">
              Confirm New Password
            </label>
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">
                lock_reset
              </span>
              <input
                id="confirm-password"
                name="confirm_password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium"
                placeholder="••••••••"
                required
                minLength={8}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#3f4945] hover:text-[#00342b] transition"
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3.5 bg-red-50/90 text-red-700 text-center rounded-xl font-medium border border-red-100 shadow-sm text-xs">
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full button-gradient py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 mt-6"
          >
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Saving New Password...
              </>
            ) : (
              'Save & Sign In'
            )}
          </button>
        </form>
      </div>

      {/* Support Info */}
      <div className="mt-8 text-white/80 font-medium text-xs flex items-center gap-4 relative z-10">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-[16px]">security</span>Secure 256-bit SSL
        </span>
        <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
        <span>24/7 Support</span>
      </div>
    </div>
  )
}

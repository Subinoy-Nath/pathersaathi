'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { sendMagicLink } from '@/app/auth/actions'

export default function MagicLinkPage() {
  const [email, setEmail] = useState('')
  const [submittedEmail, setSubmittedEmail] = useState('')
  const [isSuccess, setIsSuccess] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [cooldown, setCooldown] = useState(0)

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1)
    }, 1000)
    return () => clearInterval(timer)
  }, [cooldown])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setErrorMessage('')
    setIsLoading(true)

    const formData = new FormData(e.currentTarget)
    const currentEmail = formData.get('email') as string
    const result = await sendMagicLink(formData)

    setIsLoading(false)

    if (result.success) {
      setIsSuccess(true)
      setSubmittedEmail(currentEmail)
      setCooldown(60)
    } else {
      setErrorMessage(result.error || 'Failed to send magic link. Please try again.')
    }
  }

  const handleResend = async () => {
    if (cooldown > 0 || !submittedEmail) return
    setIsLoading(true)
    setErrorMessage('')

    const formData = new FormData()
    formData.append('email', submittedEmail)
    const result = await sendMagicLink(formData)

    setIsLoading(false)

    if (result.success) {
      setCooldown(60)
    } else {
      setErrorMessage(result.error || 'Failed to resend magic link.')
    }
  }

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-start p-4 pt-20 md:pt-24 pb-12 relative w-full text-[#191c1d]">
      <Link
        href="/login"
        className="absolute left-4 sm:left-8 top-8 py-2 px-4 rounded-md no-underline text-white hover:bg-white/10 flex items-center group text-sm z-20 transition-all font-semibold"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>{' '}
        Back to Login
      </Link>

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

      {/* Card Container */}
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl shadow-[0_20px_50px_rgba(0,77,64,0.25)] overflow-hidden transition-all duration-300 p-8">
        {!isSuccess ? (
          <div>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-extrabold text-[#00342b] tracking-tight">
                Sign in with Magic Link
              </h1>
              <p className="text-xs font-semibold text-[#006493] mt-1">
                ম্যাজিক লিংক দিয়ে লগইন করুন
              </p>
              <p className="text-xs text-[#3f4945] mt-2 leading-relaxed">
                We will email you a secure link to sign in instantly without typing a password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="magic-email" className="block text-xs font-semibold text-[#3f4945] ml-1">
                  Email Address
                </label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">
                    mail
                  </span>
                  <input
                    id="magic-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium"
                    placeholder="name@example.com"
                    required
                    autoFocus
                  />
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
                    Sending Magic Link...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-sm">magic_button</span>
                    Send Magic Link
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                <Link href="/login" className="text-xs font-semibold text-[#006493] hover:underline">
                  Prefer password? Sign In with Password
                </Link>
              </div>
            </form>
          </div>
        ) : (
          <div className="text-center space-y-5 animate-in fade-in">
            <div className="w-16 h-16 bg-[#e2f1ec] text-[#006493] rounded-full flex items-center justify-center mx-auto shadow-inner border border-[#afefdd]/50">
              <span className="material-symbols-outlined text-[32px]">forward_to_inbox</span>
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#00342b]">Check Your Inbox</h2>
              <p className="text-xs font-semibold text-[#006493] mt-1">আপনার ইনবক্স চেক করুন</p>
              <p className="text-xs text-[#3f4945] mt-3 leading-relaxed">
                We sent a magic sign-in link to <span className="font-bold text-[#00342b]">{submittedEmail}</span>. Click the link in the email to log in instantly.
              </p>
            </div>

            {/* Webmail Quick Shortcuts */}
            <div className="flex items-center justify-center gap-3 pt-1">
              <a
                href="https://mail.google.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-white border border-[#bfc9c4]/50 rounded-lg text-xs font-semibold text-[#00342b] hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition"
              >
                <span className="material-symbols-outlined text-[16px] text-red-500">mail</span>
                Open Gmail
              </a>
              <a
                href="https://outlook.live.com"
                target="_blank"
                rel="noopener noreferrer"
                className="px-3.5 py-2 bg-white border border-[#bfc9c4]/50 rounded-lg text-xs font-semibold text-[#00342b] hover:bg-gray-50 flex items-center gap-1.5 shadow-sm transition"
              >
                <span className="material-symbols-outlined text-[16px] text-blue-500">mail</span>
                Open Outlook
              </a>
            </div>

            {errorMessage && (
              <div className="p-3 bg-red-50 text-red-700 text-center rounded-xl font-medium text-xs border border-red-100">
                {errorMessage}
              </div>
            )}

            <div className="pt-2 flex flex-col gap-3">
              <button
                type="button"
                onClick={handleResend}
                disabled={cooldown > 0 || isLoading}
                className="w-full py-3 bg-white border border-[#bfc9c4]/50 rounded-xl font-semibold text-xs text-[#00342b] hover:bg-gray-50 transition disabled:opacity-50"
              >
                {cooldown > 0 ? `Resend Link in ${cooldown}s` : 'Resend Magic Link'}
              </button>

              <Link
                href="/login"
                className="w-full button-gradient py-3 rounded-xl font-semibold text-xs text-white shadow hover:shadow-md text-center"
              >
                Use Password Instead
              </Link>
            </div>
          </div>
        )}
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

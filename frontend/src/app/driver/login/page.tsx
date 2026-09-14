'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Phone, Lock, LogIn, AlertCircle, ArrowRight, Shield } from 'lucide-react'

export default function DriverLoginPage() {
  const router = useRouter()
  const [identifier, setIdentifier] = useState('')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const cleanIdentifier = identifier.trim()
    const cleanPin = pin.trim()

    if (!cleanIdentifier) {
      setError('মোবাইল নম্বর বা ইমেইল লিখুন / Please enter Mobile or Email')
      return
    }

    if (!cleanPin) {
      setError('৪ সংখ্যার পিন বা পাসওয়ার্ড দিন / Please enter PIN or Password')
      return
    }

    setLoading(true)

    try {
      let loginPayload: { email?: string; phone?: string; password: string }

      if (cleanIdentifier.includes('@')) {
        loginPayload = {
          email: cleanIdentifier,
          password: cleanPin
        }
      } else {
        // Indian phone normalization
        let phoneFormatted = cleanIdentifier.replace(/[\s-]/g, '')
        if (!phoneFormatted.startsWith('+')) {
          if (phoneFormatted.length === 10) {
            phoneFormatted = `+91${phoneFormatted}`
          } else {
            phoneFormatted = `+${phoneFormatted}`
          }
        }
        loginPayload = {
          phone: phoneFormatted,
          password: cleanPin
        }
      }

      // 1. Attempt login with Supabase Auth
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: authError } = await supabase.auth.signInWithPassword(loginPayload as any)

      if (authError) {
        // If phone sign in isn't enabled with password directly in GoTrue, fallback to checking email-mapped pattern or show helpful error
        if (cleanIdentifier.length === 10 && !cleanIdentifier.includes('@')) {
          const fallbackEmail = `driver.${cleanIdentifier}@pathersaathi.in`
          const { error: fallbackErr } = await supabase.auth.signInWithPassword({
            email: fallbackEmail,
            password: cleanPin
          })
          if (!fallbackErr) {
            router.push('/driver')
            return
          }
        }
        throw new Error(authError.message || 'ভুল নম্বর বা পিন কোড / Invalid login credentials')
      }

      if (data.user) {
        router.push('/driver')
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'লগইন ব্যর্থ হয়েছে / Login failed'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#001712] text-white flex flex-col justify-between p-4 sm:p-6 max-w-lg mx-auto w-full">
      {/* Header bar */}
      <div className="pt-4 pb-2 border-b border-[#004d40]/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#00E676]/10 border border-[#00E676]/40 rounded-xl flex items-center justify-center text-[#00E676]">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <span className="text-xs font-bold text-[#00E676] tracking-widest uppercase block">
              Pather Saathi Driver
            </span>
            <span className="text-sm font-bold text-white">
              চালক কেবিন লগইন
            </span>
          </div>
        </div>

        <a
          href="tel:+919435012345"
          className="text-xs text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 px-3 py-1.5 rounded-lg flex items-center gap-1 font-semibold"
        >
          <Phone className="w-3.5 h-3.5" /> হেল্পলাইন / Call
        </a>
      </div>

      {/* Main Form Container */}
      <div className="my-auto py-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1">
            পথের সাথী ড্রাইভার
          </h1>
          <p className="text-xs sm:text-sm text-[#00E676] font-medium">
            CABIN TERMINAL ACCESS • BARAK VALLEY
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-950/80 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-sm animate-shake">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">{error}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          {/* Identifier Input */}
          <div className="bg-[#002B22] border-2 border-[#004D40] focus-within:border-[#00E676] rounded-2xl p-3.5 transition-colors">
            <label className="block text-xs font-bold text-[#00E676] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> মোবাইল নম্বর বা আইডি / Mobile or Email
            </label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="e.g. 9876543210 or driver@pathersaathi.in"
              className="w-full bg-transparent text-white text-lg font-mono focus:outline-none placeholder:text-white/30"
              autoComplete="username"
              required
            />
          </div>

          {/* PIN Input */}
          <div className="bg-[#002B22] border-2 border-[#004D40] focus-within:border-[#00E676] rounded-2xl p-3.5 transition-colors">
            <label className="block text-xs font-bold text-[#00E676] uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" /> ৪ সংখ্যার পিন বা পাসওয়ার্ড / 4-Digit PIN
            </label>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              maxLength={20}
              className="w-full bg-transparent text-white text-2xl font-mono tracking-widest focus:outline-none placeholder:text-white/30"
              autoComplete="current-password"
              required
            />
          </div>

          {/* Massive 76px Touch Target Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-[76px] bg-[#00E676] hover:bg-[#00c864] active:scale-[0.98] text-black font-extrabold text-xl rounded-2xl flex items-center justify-center gap-3 shadow-[0_8px_25px_rgba(0,230,118,0.35)] transition-all cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
                <span>যাচাই করা হচ্ছে...</span>
              </div>
            ) : (
              <>
                <LogIn className="w-7 h-7" />
                <span>লগইন করুন / LOGIN TO CABIN</span>
                <ArrowRight className="w-6 h-6" />
              </>
            )}
          </button>
        </form>
      </div>

      {/* Footer Info */}
      <div className="text-center py-4 border-t border-[#004d40]/30 text-xs text-white/50 space-y-1">
        <p>সিলচর • করিমগঞ্জ/শ্রীভূমি • হাইলাকান্দি</p>
        <p>Helpline: +91 94350 12345 (Silchar Transit Hub)</p>
      </div>
    </div>
  )
}

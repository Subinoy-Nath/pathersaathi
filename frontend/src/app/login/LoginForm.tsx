"use client";

import { useState, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { login, signup } from './actions';
import Image from 'next/image';
import Link from 'next/link';

function SubmitButton({ pendingText, children, className = "" }: { pendingText: string, children: React.ReactNode, className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit"
      disabled={pending}
      className={`w-full button-gradient py-3.5 rounded-xl font-semibold text-sm text-white shadow-lg hover:shadow-xl hover:scale-[1.01] active:scale-[0.98] transition-all disabled:opacity-70 disabled:scale-100 flex items-center justify-center gap-2 ${className}`}
    >
      {pending ? (
        <>
          <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
          {pendingText}
        </>
      ) : children}
    </button>
  );
}

export default function LoginForm({ message, initialMode }: { message?: string; initialMode?: string }) {
  const [isLogin, setIsLogin] = useState(initialMode !== 'signup');

  useEffect(() => {
    setIsLogin(initialMode !== 'signup');
  }, [initialMode]);

  return (
    <div className="auth-bg min-h-screen flex flex-col items-center justify-center p-4 relative w-full text-[#191c1d]">
      <Link
        href="/"
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
        Back to Home
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

      {/* Auth Container */}
      <div className="relative z-10 w-full max-w-md glass-card rounded-2xl shadow-[0_20px_50px_rgba(0,77,64,0.25)] overflow-hidden transition-all duration-300">
        
        {/* Tabs */}
        <div className="flex border-b border-[#bfc9c4]/30">
          <button 
            type="button"
            className={`flex-1 py-4 font-semibold text-sm transition-all hover:bg-white/20 ${isLogin ? 'tab-active' : 'text-[#3f4945]'}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            type="button"
            className={`flex-1 py-4 font-semibold text-sm transition-all hover:bg-white/20 ${!isLogin ? 'tab-active' : 'text-[#3f4945]'}`}
            onClick={() => setIsLogin(false)}
          >
            Create Account
          </button>
        </div>

        <div className="p-8">

          {/* Login Form */}
          {isLogin && (
            <form className="space-y-4 block animate-in fade-in" action={login}>
              <div className="space-y-1.5">
                <label htmlFor="login-email" className="block text-xs font-semibold text-[#3f4945] ml-1">Email Address</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">mail</span>
                  <input 
                    id="login-email"
                    name="email"
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium" 
                    placeholder="name@example.com" 
                    type="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="login-password" className="block text-xs font-semibold text-[#3f4945] ml-1">Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">lock</span>
                  <input 
                    id="login-password"
                    name="password"
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium" 
                    placeholder="••••••••" 
                    type="password"
                    required
                  />
                </div>
              </div>

              {message && (
                <div className="mt-4 p-4 bg-red-50/90 text-red-700 text-center rounded-xl font-medium border border-red-100 shadow-sm text-sm">
                  {message}
                </div>
              )}

              <SubmitButton className="mt-6" pendingText="Signing In...">
                Sign In
              </SubmitButton>
            </form>
          )}

          {/* Signup Form */}
          {!isLogin && (
            <form className="space-y-4 block animate-in fade-in" action={signup}>
              <div className="space-y-1.5">
                <label htmlFor="signup-name" className="block text-xs font-semibold text-[#3f4945] ml-1">Full Name</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">person</span>
                  <input 
                    id="signup-name"
                    name="name"
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium" 
                    placeholder="John Doe" 
                    type="text"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-phone" className="block text-xs font-semibold text-[#3f4945] ml-1">Phone Number</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">call</span>
                  <input 
                    id="signup-phone"
                    name="phone_number"
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium" 
                    placeholder="+91 98765 43210" 
                    type="tel"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-email" className="block text-xs font-semibold text-[#3f4945] ml-1">Email Address</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">mail</span>
                  <input 
                    id="signup-email"
                    name="email"
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium" 
                    placeholder="name@example.com" 
                    type="email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="signup-password" className="block text-xs font-semibold text-[#3f4945] ml-1">Password</label>
                <div className="relative group">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[#006493]/60">lock</span>
                  <input 
                    id="signup-password"
                    name="password"
                    className="w-full pl-10 pr-4 py-3 bg-white/60 border border-[#bfc9c4]/50 rounded-xl focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#006493] transition-all outline-none text-sm text-[#00342b] font-medium" 
                    placeholder="••••••••" 
                    type="password"
                    required
                  />
                </div>
              </div>

              <p className="text-[10px] text-[#3f4945] text-center px-4 pt-2 leading-relaxed">
                By creating an account, you agree to Pather Saathi&apos;s <Link className="text-[#006493] font-semibold underline" href="#">Terms of Service</Link> and <Link className="text-[#006493] font-semibold underline" href="#">Privacy Policy</Link>.
              </p>

              {message && (
                <div className="mt-4 p-4 bg-red-50/90 text-red-700 text-center rounded-xl font-medium border border-red-100 shadow-sm text-sm">
                  {message}
                </div>
              )}

              <SubmitButton className="mt-4" pendingText="Creating Account...">
                Create Account
              </SubmitButton>
            </form>
          )}
        </div>
      </div>

      {/* Support Info */}
      <div className="mt-8 text-white/80 font-medium text-xs flex items-center gap-4 relative z-10">
        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[16px]">security</span>Secure 256-bit SSL</span>
        <span className="w-1.5 h-1.5 rounded-full bg-white/40"></span>
        <span>24/7 Support</span>
      </div>
    </div>
  );
}

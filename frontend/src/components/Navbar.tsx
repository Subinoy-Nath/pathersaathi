'use client'

import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { useState, useEffect } from 'react'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { User } from '@supabase/supabase-js'

type NavbarProps = {
  user: User | null
  role: string | null
}

export default function Navbar({ user, role }: NavbarProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const pathname = usePathname()

  const handleHomeClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (pathname === '/') {
      e.preventDefault()
      window.scrollTo({ top: 0, behavior: 'smooth' })
      setIsMenuOpen(false)
    }
  }

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMenuOpen])

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${isMenuOpen ? 'bg-transparent border-transparent shadow-none' : 'bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_8px_32px_0_rgba(0,77,64,0.08)]'}`}>
      <div className="w-full mx-auto px-4 sm:px-6 lg:px-12">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link href="/" onClick={handleHomeClick} className="flex-shrink-0 flex items-center gap-3 group">
              <Image
                src="/images/navlogo.png"
                alt="Pather Saathi Logo"
                width={52}
                height={52}
                className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-md border border-[#e1e3e4] group-hover:scale-105 transition-transform duration-300"
                unoptimized
              />
              <span className="font-extrabold text-xl sm:text-2xl tracking-tight text-gradient group-hover:opacity-90 transition-opacity">Pather Saathi</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden sm:ml-8 sm:flex sm:space-x-8">
              <Link href="/" onClick={handleHomeClick} className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-500 hover:text-gray-900 transition">
                Home
              </Link>
              {user && (
                <Link href="/bookings" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-500 hover:text-gray-900 transition">
                  My Bookings
                </Link>
              )}
              {role === 'operator' && (
                <>
                  <Link href="/operator" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-500 hover:text-gray-900 transition">
                    Dashboard
                  </Link>
                  <Link href="/operator/fleet" className="inline-flex items-center px-1 pt-1 border-b-2 border-transparent hover:border-blue-500 text-sm font-medium text-gray-500 hover:text-gray-900 transition">
                    Fleet
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="hidden sm:flex sm:items-center sm:space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {role === 'operator' && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-semibold">Operator</span>}
                <Link href="/profile" className="w-9 h-9 rounded-full bg-[#004d40] text-white flex items-center justify-center hover:bg-[#00342b] transition-colors" title={user.email || 'Profile'}>
                  <span className="material-symbols-outlined text-[20px]">person</span>
                </Link>
                <button
                  onClick={() => logout()}
                  className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex space-x-4">
                <Link href="/login" className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-4 py-2 rounded-lg text-sm font-medium transition">
                  Log in
                </Link>
                <Link href="/login?mode=signup" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm">
                  Sign up
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center sm:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="relative w-10 h-10 flex flex-col justify-center items-center group z-[60] focus:outline-none"
              aria-label="Toggle menu"
            >
              <span className={`block w-6 h-0.5 bg-[#004d40] rounded-full transition-all duration-300 ease-out ${isMenuOpen ? 'rotate-45 translate-y-1.5' : '-translate-y-1.5'}`}></span>
              <span className={`block w-6 h-0.5 bg-[#004d40] rounded-full transition-all duration-300 ease-out ${isMenuOpen ? 'opacity-0' : 'opacity-100'}`}></span>
              <span className={`block w-6 h-0.5 bg-[#004d40] rounded-full transition-all duration-300 ease-out ${isMenuOpen ? '-rotate-45 -translate-y-1.5' : 'translate-y-1.5'}`}></span>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Fullscreen Menu */}
      <div 
        className={`fixed inset-0 bg-white/80 backdrop-blur-2xl z-40 flex flex-col transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] sm:hidden ${
          isMenuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-full pointer-events-none'
        }`}
      >
        <div className="flex-1 overflow-y-auto px-6 pt-28 pb-8 flex flex-col h-full">
          <div className="flex flex-col space-y-6 flex-1">
            <Link onClick={(e) => { handleHomeClick(e); setIsMenuOpen(false); }} href="/" className="text-3xl font-extrabold text-[#00342b] hover:text-[#00affe] transition-colors">
              Home
            </Link>
            {user && (
              <Link onClick={() => setIsMenuOpen(false)} href="/bookings" className="text-3xl font-extrabold text-[#00342b] hover:text-[#00affe] transition-colors">
                My Bookings
              </Link>
            )}
            {role === 'operator' && (
              <>
                <Link onClick={() => setIsMenuOpen(false)} href="/operator" className="text-3xl font-extrabold text-[#00342b] hover:text-[#00affe] transition-colors">
                  Dashboard
                </Link>
                <Link onClick={() => setIsMenuOpen(false)} href="/operator/fleet" className="text-3xl font-extrabold text-[#00342b] hover:text-[#00affe] transition-colors">
                  Fleet Management
                </Link>
              </>
            )}
            {!user && (
              <div className="flex-1 flex flex-col items-center justify-center text-center opacity-80 mt-8 mb-4">
                <div className="w-32 h-32 bg-gradient-to-br from-[#e2f1ec] to-white rounded-full flex items-center justify-center mb-6 shadow-inner border border-white/60">
                  <span className="material-symbols-outlined text-[56px] text-[#00affe]">directions_bus</span>
                </div>
                <h3 className="text-2xl font-bold text-[#00342b] mb-2">Welcome Aboard</h3>
                <p className="text-base text-[#3f4945] max-w-[260px] leading-relaxed">Log in to track your bookings and unlock seamless travel across Barak Valley.</p>
              </div>
            )}
          </div>

          <div className="pt-8 mt-auto border-t border-[#bfc9c4]/30 flex flex-col space-y-4">
            {user ? (
              <>
                <div className="flex items-center gap-4 mb-4 bg-white/50 p-4 rounded-2xl border border-white/40 shadow-sm">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#004d40] to-[#00affe] flex items-center justify-center text-white shadow-md">
                    <span className="material-symbols-outlined text-[24px]">person</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[#191c1d] truncate max-w-[200px]">{user.email}</div>
                    <div className="text-xs font-semibold text-[#00affe] uppercase tracking-wider">{role || 'Customer'}</div>
                  </div>
                </div>
                <Link onClick={() => setIsMenuOpen(false)} href="/profile" className="w-full py-4 bg-white border border-[#bfc9c4]/40 rounded-xl text-center font-bold text-[#00342b] shadow-sm hover:shadow-md transition-all">
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    logout()
                  }}
                  className="w-full py-4 bg-red-50 border border-red-100 rounded-xl text-center font-bold text-red-600 shadow-sm hover:shadow-md hover:bg-red-100 transition-all"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link onClick={() => setIsMenuOpen(false)} href="/login" className="w-full py-4 bg-white border border-[#bfc9c4]/40 rounded-xl text-center font-bold text-[#00342b] shadow-sm hover:shadow-md transition-all">
                  Log In
                </Link>
                <Link onClick={() => setIsMenuOpen(false)} href="/login?mode=signup" className="w-full py-4 bg-gradient-to-r from-[#004d40] to-[#00affe] rounded-xl text-center font-bold text-white shadow-lg shadow-[#00affe]/20 hover:shadow-xl transition-all">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}

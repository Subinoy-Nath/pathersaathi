'use client'

import Link from 'next/link'
import { logout } from '@/app/auth/actions'
import { useState } from 'react'
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

  return (
    <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-white/20 shadow-[0_8px_32px_0_rgba(0,77,64,0.08)]">
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
              className="inline-flex items-center justify-center p-3 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="sm:hidden absolute w-full left-0 top-[64px] border-b border-gray-100 bg-white shadow-xl z-40 pb-4">
          <div className="pt-2 pb-3 space-y-1">
            <Link onClick={(e) => { handleHomeClick(e); setIsMenuOpen(false); }} href="/" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-blue-500">
              Home
            </Link>
            {user && (
              <Link onClick={() => setIsMenuOpen(false)} href="/bookings" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-blue-500">
                My Bookings
              </Link>
            )}
            {role === 'operator' && (
              <>
                <Link onClick={() => setIsMenuOpen(false)} href="/operator" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-blue-500">
                  Dashboard
                </Link>
                <Link onClick={() => setIsMenuOpen(false)} href="/operator/fleet" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-blue-500">
                  Fleet Management
                </Link>
              </>
            )}
          </div>
          <div className="pt-4 pb-3 border-t border-gray-100">
            {user ? (
              <div className="px-4 space-y-3">
                <div>
                  <div className="text-base font-medium text-gray-800">{user.email}</div>
                  <div className="text-sm font-medium text-gray-500 capitalize">{role || 'Customer'}</div>
                </div>
                <Link onClick={() => setIsMenuOpen(false)} href="/profile" className="block w-full text-left px-4 py-2 border border-gray-200 rounded-md text-base font-medium text-gray-700 bg-white hover:bg-gray-50">
                  My Profile
                </Link>
                <button
                  onClick={() => {
                    setIsMenuOpen(false)
                    logout()
                  }}
                  className="block w-full text-left px-4 py-2 border border-gray-200 rounded-md text-base font-medium text-gray-700 bg-gray-50 hover:bg-gray-100"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="px-4 space-y-2">
                <Link onClick={() => setIsMenuOpen(false)} href="/login" className="block w-full text-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-base font-medium text-gray-700 bg-white hover:bg-gray-50">
                  Log in
                </Link>
                <Link onClick={() => setIsMenuOpen(false)} href="/login?mode=signup" className="block w-full text-center px-4 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-blue-600 hover:bg-blue-700">
                  Sign up
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}

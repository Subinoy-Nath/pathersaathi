'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Footer() {
  const pathname = usePathname()

  // Suppress footer on driver HUD routes to keep the cockpit uncluttered
  if (pathname?.startsWith('/driver')) {
    return null
  }

  return (
    <footer className="bg-[#f8fafb] text-[#191c1d] border-t border-[#d8dadb] transition-all">
      <div className="max-w-7xl mx-auto px-5 lg:px-12 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Col 1: Brand & Regional Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Image
                src="/images/navlogo.png"
                alt="Pather Saathi"
                width={44}
                height={44}
                className="w-11 h-11 rounded-full object-cover shadow-sm border border-[#e1e3e4]"
                unoptimized
              />
              <span className="font-extrabold text-xl tracking-tight text-gradient">
                Pather Saathi
              </span>
            </div>
            <p className="text-xs text-[#3f4945] leading-relaxed">
              Barak Valley&apos;s premier ultra-local transit and charter booking network. Connecting Sribhumi, Silchar, and Hailakandi with verified fleet operators and real-time transit intelligence.
            </p>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f1ec] text-[#006493] text-[11px] font-semibold">
              <span className="material-symbols-outlined text-[14px]">shield</span>
              DPDPA 2023 Compliant
            </div>
          </div>

          {/* Col 2: Transit & Fleet Portals */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#00342b]">
              Transit Services
            </h3>
            <ul className="space-y-2 text-xs font-medium text-[#3f4945]">
              <li>
                <Link href="/" className="hover:text-[#006493] transition-colors">
                  Daily Bus Schedules
                </Link>
              </li>
              <li>
                <Link href="/bookings" className="hover:text-[#006493] transition-colors">
                  My Ticket Bookings
                </Link>
              </li>
              <li>
                <Link href="/operator" className="hover:text-[#006493] transition-colors">
                  Operator Portal
                </Link>
              </li>
              <li>
                <Link href="/operator/fleet" className="hover:text-[#006493] transition-colors">
                  Fleet Management
                </Link>
              </li>
              <li>
                <Link href="/driver/login" className="hover:text-[#006493] transition-colors">
                  Driver Cabin HUD
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Legal & Trust Center */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#00342b]">
              Legal & Trust
            </h3>
            <ul className="space-y-2 text-xs font-medium text-[#3f4945]">
              <li>
                <Link href="/privacy" className="hover:text-[#006493] transition-colors font-semibold text-[#006493]">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link href="/privacy#gps-telemetry" className="hover:text-[#006493] transition-colors">
                  GPS Telemetry & 30-Day Purge
                </Link>
              </li>
              <li>
                <Link href="/privacy#rights" className="hover:text-[#006493] transition-colors">
                  Data Principal Rights
                </Link>
              </li>
              <li>
                <Link href="/privacy#grievance" className="hover:text-[#006493] transition-colors">
                  Grievance Redressal
                </Link>
              </li>
              <li>
                <Link href="/auth/magic-link" className="hover:text-[#006493] transition-colors">
                  Passwordless Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 4: Contact & Operations */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#00342b]">
              Contact & Support
            </h3>
            <div className="space-y-2.5 text-xs text-[#3f4945] font-medium">
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006493] text-[18px]">mail</span>
                <a href="mailto:support@pathersaathi.in" className="hover:underline">
                  support@pathersaathi.in
                </a>
              </p>
              <p className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006493] text-[18px]">call</span>
                <a href="tel:+916002089037" className="hover:underline">
                  +91 6002089037
                </a>
              </p>
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-[#006493] text-[18px] shrink-0 mt-0.5">location_on</span>
                <span>Sribhumi, Barak Valley, Assam - 788710</span>
              </p>
            </div>
          </div>
        </div>

        {/* Bottom divider and copyright */}
        <div className="mt-10 pt-6 border-t border-[#bfc9c4]/30 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-[#707975]">
          <p>© {new Date().getFullYear()} Pather Saathi Transit Technologies. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/privacy" className="hover:text-[#006493] transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/privacy#grievance" className="hover:text-[#006493] transition-colors">
              Grievance Officer
            </Link>
            <span>•</span>
            <span>Barak Valley, Assam</span>
          </div>
        </div>
      </div>
    </footer>
  )
}

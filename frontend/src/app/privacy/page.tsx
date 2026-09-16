import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy | Pather Saathi',
  description:
    'Comprehensive Privacy Policy compliant with DPDPA 2023 for Pather Saathi transit passengers, drivers, and operators in Barak Valley, Assam.',
}

const SECTIONS = [
  { id: 'fiduciary', title: '1. Data Fiduciary & Identity' },
  { id: 'collection', title: '2. Categories of Data Collected' },
  { id: 'gps-telemetry', title: '3. GPS Telemetry & 30-Day Purge' },
  { id: 'purposes', title: '4. Purposes of Data Processing' },
  { id: 'third-parties', title: '5. Infrastructure & Non-Sale Clause' },
  { id: 'rights', title: '6. Your Rights Under DPDPA 2023' },
  { id: 'security', title: '7. Technical Security Safeguards' },
  { id: 'children', title: "8. Children's Data Protection" },
  { id: 'modifications', title: '9. Revisions & Updates' },
  { id: 'grievance', title: '10. Grievance Redressal Officer' },
]

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 text-[#191c1d] pt-24 pb-20">
      {/* Hero Header */}
      <header className="bg-white border-b border-[#e1e3e4] py-12 px-5 sm:px-8 lg:px-12">
        <div className="max-w-6xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#e2f1ec] text-[#006493] text-xs font-semibold mb-4">
            <span className="material-symbols-outlined text-[16px]">verified_user</span>
            Digital Personal Data Protection Act (DPDPA 2023) Compliant
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-[#00342b] tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-sm sm:text-base font-semibold text-[#006493] mt-2">
            গোপনীয়তা নীতি — যাত্রী, চালক এবং ফ্লিট অপারেটরদের তথ্যের সুরক্ষা
          </p>
          <p className="text-xs sm:text-sm text-[#707975] mt-3">
            Last Updated & Effective Date: September 16, 2026 • Version 2.0 (Barak Valley Regional Corridor)
          </p>
        </div>
      </header>

      {/* Main Content Layout */}
      <div className="max-w-6xl mx-auto px-5 sm:px-8 lg:px-12 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Table of Contents (Sticky on Desktop) */}
          <aside className="lg:col-span-4 hidden lg:block">
            <div className="sticky top-28 bg-white border border-[#e1e3e4] rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#00342b] mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#00affe] text-[18px]">list_alt</span>
                Table of Contents
              </h2>
              <nav className="space-y-1.5">
                {SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="block py-1.5 px-2.5 rounded-lg text-xs font-medium text-[#3f4945] hover:text-[#006493] hover:bg-[#f2f4f5] transition-colors"
                  >
                    {section.title}
                  </a>
                ))}
              </nav>

              <div className="mt-6 pt-6 border-t border-[#bfc9c4]/30 space-y-3 text-xs text-[#707975]">
                <p>
                  Need immediate help with your account data?
                </p>
                <a
                  href="mailto:support@pathersaathi.in"
                  className="inline-flex items-center gap-1.5 text-[#006493] font-semibold hover:underline"
                >
                  <span className="material-symbols-outlined text-[16px]">mail</span>
                  support@pathersaathi.in
                </a>
              </div>
            </div>
          </aside>

          {/* Legal Clauses & Body */}
          <main className="lg:col-span-8 space-y-10">
            
            {/* Quick Summary Callout */}
            <div className="bg-[#e2f1ec]/60 border border-[#afefdd] rounded-2xl p-6 shadow-sm">
              <h3 className="text-base font-bold text-[#00342b] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#006493]">info</span>
                At a Glance: Our Data Commitments
              </h3>
              <ul className="mt-3 space-y-2 text-xs text-[#00342b] leading-relaxed">
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span><strong>Zero Data Brokerage:</strong> We never sell, rent, or trade your personal or travel data to third parties.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span><strong>Automated 30-Day GPS Purge:</strong> High-frequency live vehicle tracking points are permanently expunged every 30 days.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-green-600 text-[16px] shrink-0 mt-0.5">check_circle</span>
                  <span><strong>Data Sovereignty:</strong> Passenger and vehicle records are hosted securely with strict Row-Level Security (RLS) protections.</span>
                </li>
              </ul>
            </div>

            {/* Section 1 */}
            <section id="fiduciary" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">1</span>
                Data Fiduciary & Identity
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                Under the provisions of the <strong>Digital Personal Data Protection Act, 2023 (DPDPA)</strong> and the <strong>Information Technology Act, 2000</strong>, the Data Fiduciary responsible for processing personal data on this transit platform is:
              </p>
              <div className="bg-[#f8fafb] border border-[#e1e3e4] rounded-xl p-4 text-xs space-y-1 font-mono text-[#00342b]">
                <p><strong>Entity:</strong> Pather Saathi Transit Technologies</p>
                <p><strong>Headquarters:</strong> Sribhumi, Barak Valley, Assam - 788710, India</p>
                <p><strong>Operational Corridors:</strong> Sribhumi • Silchar • Hailakandi • Cachar District Transit</p>
                <p><strong>Email Contact:</strong> support@pathersaathi.in</p>
                <p><strong>Emergency Telephone:</strong> +91 6002089037</p>
              </div>
            </section>

            {/* Section 2 */}
            <section id="collection" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">2</span>
                Categories of Personal Data Collected
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                Pather Saathi collects only the minimal personal data necessary to facilitate safe, reliable, and verified transit bookings in Barak Valley:
              </p>
              <div className="space-y-3 text-xs sm:text-sm text-[#3f4945]">
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-[#00342b]">A. Passenger Data:</strong> Name, mobile phone number (normalized to E.164 +91), email address, pickup and drop-off points, seat reservations, ticket PNRs, and booking payment statuses.
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-[#00342b]">B. Bus Driver & Crew Data:</strong> Full legal name, mobile contact, assigned vehicle registration number, active shift status, and high-frequency real-time GPS location during active transit trips.
                </div>
                <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-100">
                  <strong className="text-[#00342b]">C. Fleet Operator Data:</strong> Business name, proprietor details, fleet vehicle registration documents, route permits, and dispatch schedules.
                </div>
              </div>
            </section>

            {/* Section 3: GPS Telemetry & Purge */}
            <section id="gps-telemetry" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-800 text-[11px] font-bold border border-amber-200">
                <span className="material-symbols-outlined text-[14px]">my_location</span>
                Special Transparency Disclosure
              </div>
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">3</span>
                Real-Time Vehicle GPS Telemetry & Automated 30-Day Purge
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                To power real-time bus tracking and arrival time predictions for passengers across the Barak Valley highways, driver devices stream high-frequency GPS coordinates (latitude, longitude, speed, heading, and timestamp) while an active trip run is in progress.
              </p>
              <div className="p-4 bg-[#f8fafb] border-l-4 border-[#00affe] rounded-r-xl space-y-2 text-xs sm:text-sm text-[#00342b]">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[#006493]">auto_delete</span>
                  Automated 30-Day Data Minimization Purge
                </p>
                <p className="text-[#3f4945] leading-relaxed">
                  In strict accordance with DPDPA 2023 data minimization mandates, fine-grained GPS coordinate breadcrumbs recorded in our database table (<code>public.trip_locations</code>) are <strong>automatically and permanently deleted after thirty (30) days</strong> via a scheduled database maintenance job (<code>purge_stale_trip_locations</code>). 
                </p>
                <p className="text-[#3f4945] leading-relaxed">
                  Historical aggregate trip summaries (origin, destination, departure time, and passenger count) are preserved for statutory tax and audit compliance, but high-resolution geographic paths are irreversibly purged.
                </p>
              </div>
            </section>

            {/* Section 4 */}
            <section id="purposes" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">4</span>
                Purposes of Data Processing
              </h2>
              <ul className="space-y-2 text-xs sm:text-sm text-[#3f4945] list-disc list-inside leading-relaxed">
                <li>Facilitating bus seat reservations and whole-vehicle charters between Sribhumi, Silchar, and Hailakandi.</li>
                <li>Dispatching digital ticket confirmations, PNR vouchers, and trip updates via transactional SMS and WhatsApp.</li>
                <li>Broadcasting active bus locations on public map visualizers for passenger safety and schedule certainty.</li>
                <li>Authenticating passengers and operators using secure email Magic Links, OTPs, and encrypted credentials.</li>
                <li>Broadcasting real-time disruption or schedule cancellation alerts when road conditions or weather impact transit.</li>
              </ul>
            </section>

            {/* Section 5: Non-Sale Clause */}
            <section id="third-parties" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">5</span>
                Infrastructure Partners & Strict Non-Sale Clause
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                We contract only with ISO-certified infrastructure processors that comply with Indian data residency and privacy requirements:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-[#3f4945] list-disc list-inside leading-relaxed">
                <li><strong>Supabase:</strong> Managed PostgreSQL cloud database, authentication service, and WebSockets realtime GPS channel.</li>
                <li><strong>Vercel Inc.:</strong> Application compute, edge network hosting, and Core Web Vitals telemetry.</li>
                <li><strong>Transactional SMS Gateways (Fast2SMS / Twilio):</strong> TRAI DLT-registered telecommunication gateways delivering OTP and ticket notifications.</li>
              </ul>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs sm:text-sm text-emerald-950 font-medium">
                <strong>Strict Prohibition on Selling Data:</strong> Pather Saathi does not, under any circumstance, sell, rent, monetize, or disclose user data to advertisers, credit bureaus, or commercial third parties.
              </div>
            </section>

            {/* Section 6 */}
            <section id="rights" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">6</span>
                Your Rights Under DPDPA 2023
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                As a Data Principal under Indian law, you possess enforceable legal rights regarding your personal information:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 bg-[#f8fafb] rounded-xl border border-[#e1e3e4]">
                  <h4 className="font-bold text-[#00342b] mb-1">Right to Access</h4>
                  <p className="text-[#3f4945]">You may inspect the summary of personal data and processing activities associated with your account.</p>
                </div>
                <div className="p-3.5 bg-[#f8fafb] rounded-xl border border-[#e1e3e4]">
                  <h4 className="font-bold text-[#00342b] mb-1">Right to Correction</h4>
                  <p className="text-[#3f4945]">You can correct out-of-date phone numbers, names, or email credentials at any time in your Profile.</p>
                </div>
                <div className="p-3.5 bg-[#f8fafb] rounded-xl border border-[#e1e3e4]">
                  <h4 className="font-bold text-[#00342b] mb-1">Right to Erasure</h4>
                  <p className="text-[#3f4945]">You may request permanent account deletion and removal of your personal travel history, subject to statutory tax laws.</p>
                </div>
                <div className="p-3.5 bg-[#f8fafb] rounded-xl border border-[#e1e3e4]">
                  <h4 className="font-bold text-[#00342b] mb-1">Right to Grievance Redressal</h4>
                  <p className="text-[#3f4945]">You are entitled to rapid resolution of data inquiries by our designated officer within 30 statutory days.</p>
                </div>
              </div>
            </section>

            {/* Section 7 */}
            <section id="security" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">7</span>
                Technical Security Safeguards
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                We implement comprehensive technical and organizational safeguards:
              </p>
              <ul className="space-y-2 text-xs sm:text-sm text-[#3f4945] list-disc list-inside leading-relaxed">
                <li><strong>Row-Level Security (RLS):</strong> Granular PostgreSQL security policies ensuring passengers and fleet operators can only read or write records they legitimately own.</li>
                <li><strong>Transport Layer Encryption:</strong> All data in transit is encrypted using 256-bit TLS/SSL certificates with strict HTTPS enforcement.</li>
                <li><strong>PKCE & Cookie Protection:</strong> Authentication codes utilize RFC 7636 Proof Key for Code Exchange (PKCE) and HTTP-only, secure, same-site session cookies.</li>
                <li><strong>Cryptographic Password Hashing:</strong> Passwords are hashed using modern salted bcrypt algorithms and are never stored in plaintext.</li>
              </ul>
            </section>

            {/* Section 8 */}
            <section id="children" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">8</span>
                Protection of Children & Minors
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                In compliance with DPDPA 2023 Section 9, Pather Saathi does not intentionally track, profile, or solicit personal data from children under the age of 18 without verifiable consent from a parent or legal guardian. Bookings for minors must be arranged and supervised by an adult ticket holder.
              </p>
            </section>

            {/* Section 9 */}
            <section id="modifications" className="bg-white border border-[#e1e3e4] rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#e2f1ec] text-[#006493] flex items-center justify-center font-bold text-sm">9</span>
                Revisions & Updates to This Policy
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                We may periodically update this policy to incorporate new transit features, revised statutory guidelines, or regional transit regulations. Whenever changes occur, the &quot;Last Updated&quot; date at the top of this document will be amended, and prominent notices will be displayed on the platform homepage for material modifications.
              </p>
            </section>

            {/* Section 10: Grievance Officer */}
            <section id="grievance" className="bg-white border-2 border-[#006493]/20 rounded-2xl p-6 sm:p-8 shadow-sm space-y-4">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e2f1ec] text-[#006493] text-[11px] font-bold">
                <span className="material-symbols-outlined text-[14px]">support_agent</span>
                Statutory Redressal Contact
              </div>
              <h2 className="text-xl font-bold text-[#00342b] flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-[#006493] text-white flex items-center justify-center font-bold text-sm">10</span>
                Grievance Redressal Officer
              </h2>
              <p className="text-xs sm:text-sm text-[#3f4945] leading-relaxed">
                Under Section 10 of the Digital Personal Data Protection Act, 2023, if you have any questions, concerns, complaints, or exercise of data rights, you may address our designated Grievance Officer:
              </p>

              <div className="bg-white border border-[#bfc9c4]/50 rounded-xl p-5 shadow-inner space-y-2 text-xs sm:text-sm text-[#00342b]">
                <p><strong>Designation:</strong> Data Protection & Grievance Redressal Officer</p>
                <p><strong>Organization:</strong> Pather Saathi Transit Technologies</p>
                <p><strong>Office Address:</strong> Pather Saathi Transit Center, Station Road, Sribhumi, Barak Valley, Assam - 788710</p>
                <p><strong>Email Address:</strong> <a href="mailto:support@pathersaathi.in" className="text-[#006493] font-semibold underline">support@pathersaathi.in</a> / <a href="mailto:grievance@pathersaathi.in" className="text-[#006493] font-semibold underline">grievance@pathersaathi.in</a></p>
                <p><strong>Phone:</strong> +91 6002089037 (Monday – Saturday, 9:00 AM – 6:00 PM IST)</p>
                <p><strong>Statutory Resolution Timeline:</strong> All valid grievances will be acknowledged within 48 hours and definitively resolved within 30 business days.</p>
              </div>

              <div className="pt-2 flex flex-wrap gap-4">
                <a
                  href="mailto:support@pathersaathi.in?subject=DPDPA%20Data%20Request"
                  className="button-gradient px-5 py-2.5 rounded-xl font-semibold text-xs text-white shadow hover:shadow-md transition inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[16px]">outgoing_mail</span>
                  Submit Data Request
                </a>
                <Link
                  href="/"
                  className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-xs text-[#00342b] transition inline-flex items-center gap-2"
                >
                  Back to Homepage
                </Link>
              </div>
            </section>

          </main>
        </div>
      </div>
    </div>
  )
}

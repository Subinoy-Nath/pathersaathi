import { cookies } from 'next/headers'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import BookingActionButtons from '@/components/BookingActionButtons'
import LiveBookingsRefresher from '@/components/LiveBookingsRefresher'
import ClearHistoryButton from '@/components/ClearHistoryButton'
import AnimatedTableBody from '@/components/AnimatedTableBody'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default async function OperatorDashboard() {
  const supabase = await createClient()

  // Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Get user profile
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'operator') {
    return (
      <div className="p-8 text-center min-h-screen bg-[#f8fafb] flex flex-col justify-center items-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">Unauthorized</h1>
        <p className="text-[#3f4945] text-lg">Only verified operators can access this dashboard.</p>
        <Link href="/" className="mt-8 bg-black text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-800 transition">
          Return Home
        </Link>
      </div>
    )
  }

  // Fetch operator's vehicles
  const { data: vehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', user.id)
    .is('deleted_at', null)

  const vehicleIds = vehicles?.map(v => v.id) || []

  // To get bookings for this operator, we need bookings that either:
  // 1. Point to a schedule for one of their vehicles
  // 2. Or point directly to their vehicles via booking_vehicles (whole vehicle)

  // We first need to get schedules for these vehicles
  const { data: schedules } = await supabase
    .from('schedules')
    .select('id')
    .in('vehicle_id', vehicleIds)
    .is('deleted_at', null)

  const scheduleIds = schedules?.map(s => s.id) || []

  // We also get bookings directly associated via booking_vehicles
  const { data: bookingVehicles } = await supabase
    .from('booking_vehicles')
    .select('booking_id')
    .in('vehicle_id', vehicleIds)
    .is('deleted_at', null)

  const bvBookingIds = bookingVehicles?.map(bv => bv.booking_id) || []

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let bookings: any[] = []

  if (scheduleIds.length > 0 || bvBookingIds.length > 0) {
    let query = supabase
      .from('bookings')
      .select(`
        id,
        booking_reference,
        booking_type,
        status,
        travel_date,
        start_date,
        end_date,
        seats_requested,
        updated_at,
        users!bookings_customer_id_fkey ( name, phone_number ),
        schedules (
          departure_time,
          vehicles ( name, registration_number ),
          routes (
            origin:locations!routes_origin_id_fkey ( name ),
            destination:locations!routes_destination_id_fkey ( name )
          )
        ),
        booking_vehicles (
          vehicles ( name, registration_number, owner_id )
        )
      `)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50)

    // Construct the OR filter for schedule_id OR id in bvBookingIds
    if (scheduleIds.length > 0 && bvBookingIds.length > 0) {
      query = query.or(`schedule_id.in.(${scheduleIds.join(',')}),id.in.(${bvBookingIds.join(',')})`)
    } else if (scheduleIds.length > 0) {
      query = query.in('schedule_id', scheduleIds)
    } else if (bvBookingIds.length > 0) {
      query = query.in('id', bvBookingIds)
    }

    const { data: bookingsData, error } = await query

    if (bookingsData && !error) {
      bookings = bookingsData
    } else {
      console.error(error)
    }
  }

  // Filter out cleared bookings based on cookie
  const cookieStore = await cookies()
  const clearedTimeStr = cookieStore.get('operator_cleared_time')?.value
  const clearedTime = clearedTimeStr ? parseInt(clearedTimeStr) : 0

  if (clearedTime > 0) {
    bookings = bookings.filter(b => {
      if (b.status === 'rejected' || b.status === 'cancelled') {
        const updatedTime = new Date(b.updated_at).getTime()
        if (updatedTime <= clearedTime) return false
      }
      return true
    })
  }

  return (
    <div className="bg-[#f8fafb] text-[#191c1d] min-h-screen pt-20">
      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:flex flex-col sticky top-20 h-[calc(100vh-80px)] overflow-y-auto w-80 bg-white p-4 space-y-4 border-r border-[#bfc9c4]/20 shadow-sm z-10">
          <div className="flex flex-col gap-1 p-4 bg-[#f2f4f5] rounded-xl mb-4">
            <span className="text-xl font-bold text-[#00342b] capitalize">{profile.role}</span>
            <span className="text-sm font-semibold text-[#3f4945]">Pather Saathi Partner</span>
          </div>
          <nav className="flex flex-col space-y-1">
            <Link href="/operator" className="flex items-center gap-3 px-4 py-3 bg-[#00affe] text-[#003f5f] rounded-lg font-bold transition-all ease-in-out">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm">Dashboard</span>
            </Link>
            <Link href="/operator/fleet" className="flex items-center gap-3 px-4 py-3 text-[#3f4945] hover:bg-[#e6e8e9] rounded-lg hover:translate-x-1 duration-300">
              <span className="material-symbols-outlined">directions_bus</span>
              <span className="text-sm">Fleet Monitoring</span>
            </Link>
            <a href="#" className="flex items-center gap-3 px-4 py-3 text-[#3f4945] hover:bg-[#e6e8e9] rounded-lg hover:translate-x-1 duration-300">
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="text-sm">Booking Ledger</span>
            </a>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 md:p-8 space-y-8">
          <LiveBookingsRefresher />

          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-[#00342b]">Operator Dashboard</h1>
              <p className="text-base font-medium text-[#3f4945] mt-1">Welcome back, <span className="font-bold text-[#00342b]">{profile.name}</span></p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/" className="glass-card flex items-center gap-2 px-6 py-2.5 rounded-xl text-[#00342b] border border-[#00342b]/10 hover:bg-[#004d40]/5 transition-all">
                <span className="material-symbols-outlined text-[20px]">visibility</span>
                <span className="font-semibold text-sm">Live Site</span>
              </Link>
              <Link href="/operator/fleet" className="bg-gradient-to-r from-[#004d40] to-[#00affe] text-white px-8 py-2.5 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all">
                Manage Fleet
              </Link>
            </div>
          </header>

          {/* Your Fleet Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-[#00342b]">Your Fleet</h2>
                <span className="bg-[#00affe] text-[#003f5f] px-3 py-0.5 rounded-full text-xs font-bold">{vehicles?.length || 0} Vehicles</span>
              </div>
              <Link href="/operator/fleet" className="text-[#006493] font-semibold text-sm hover:underline transition-all">View All Vehicles</Link>
            </div>

            {(!vehicles || vehicles.length === 0) ? (
              <div className="glass-card electric-glow border border-[#00affe]/30 p-10 rounded-xl flex flex-col items-center justify-center gap-4 text-[#3f4945] hover:bg-[#f8fafb] transition-colors group shadow-sm">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00affe]/20 to-[#004d40]/20 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-transform duration-300">
                  <span className="material-symbols-outlined text-[48px] text-[#006493]">add_circle</span>
                </div>
                <span className="font-bold text-xl text-[#00342b]">Add New Vehicle</span>
                <p className="text-sm text-center max-w-sm mb-2 text-[#3f4945]">You haven&apos;t registered any vehicles yet. Click below to add your first bus to the fleet and start accepting bookings.</p>
                <Link href="/operator/fleet" className="bg-[#00342b] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#004d40] hover:shadow-lg transition-all duration-300">
                  Manage Fleet
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {vehicles.map(v => (
                  <div key={v.id} className="glass-card electric-glow p-5 rounded-xl border border-white/40 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300">
                    <div className="w-full h-32 rounded-lg bg-[#e6e8e9] overflow-hidden relative flex items-center justify-center text-[#3f4945]">
                      {v.image_url ? (
                        <Image src={v.image_url} alt={v.name} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-500" unoptimized />
                      ) : (
                        <span className="material-symbols-outlined text-4xl">directions_bus</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-bold text-[#00342b]">{v.name}</h3>
                      <div className="flex items-center gap-2 text-[#3f4945]">
                        <span className="material-symbols-outlined text-[18px]">license</span>
                        <span className="text-sm font-mono font-medium">{v.registration_number}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t border-[#bfc9c4]/30">
                      <div className="flex items-center gap-1.5 text-[#006493]">
                        <span className="material-symbols-outlined text-[18px]">airline_seat_recline_extra</span>
                        <span className="text-sm font-semibold">{v.capacity_seats} Seats</span>
                      </div>
                      <span className="flex items-center gap-1 text-green-600 text-xs font-bold">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Active
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recent Bookings Section */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[#00342b]">Recent Bookings</h2>
              <div className="flex gap-2">
                <ClearHistoryButton />
                <button 
                  className="bg-[#e6e8e9] px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-[#d8dbdc] hover:-translate-y-0.5 transition-all duration-200"
                  title="Export currently visible bookings to a CSV file"
                >
                  Export CSV
                </button>
                <button 
                  className="bg-[#e6e8e9] px-4 py-1.5 rounded-lg text-xs font-medium hover:bg-[#d8dbdc] hover:-translate-y-0.5 transition-all duration-200"
                  title="Filter bookings by date, status, or route"
                >
                  Filters
                </button>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/40 overflow-hidden shadow-xl shadow-[#00342b]/5">
              <div className="overflow-x-auto glass-scroll">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#e6e8e9] border-b border-[#bfc9c4]/50">
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold uppercase tracking-wider">Reference</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold uppercase tracking-wider">Trip Details</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-center uppercase tracking-wider">Seats</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold uppercase tracking-wider">Status & Actions</th>
                    </tr>
                  </thead>
                  <AnimatedTableBody className="divide-y divide-[#bfc9c4]/20">
                    {bookings.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-16 text-center">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <div className="w-16 h-16 rounded-full bg-white/50 flex items-center justify-center mb-2 shadow-inner border border-white/60">
                              <span className="material-symbols-outlined text-4xl text-[#bfc9c4]">inbox</span>
                            </div>
                            <h3 className="text-lg font-bold text-[#00342b]">No Bookings Yet</h3>
                            <p className="text-sm text-[#3f4945] max-w-xs mx-auto">When customers book your vehicles, they will appear here automatically.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      bookings.map((b: any) => {
                        const cust = b.users
                        const isWholeVehicle = b.booking_type === 'whole_vehicle'
                        const sched = b.schedules
                        const originName = sched?.routes?.origin?.name || 'Unknown'
                        const destName = sched?.routes?.destination?.name || 'Unknown'

                        const startDateObj = b.start_date ? new Date(b.start_date) : null
                        const endDateObj = b.end_date ? new Date(b.end_date) : null

                        let formattedTime = 'Unknown'
                        if (sched?.departure_time) {
                          const dt = new Date(sched.departure_time)
                          if (!isNaN(dt.getTime())) {
                            formattedTime = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                          } else {
                            formattedTime = sched.departure_time.substring(0, 5)
                          }
                        }

                        // Determine initial badge letter
                        const initials = cust?.name ? cust.name.substring(0, 2).toUpperCase() : 'GU'

                        return (
                          <tr key={b.id} className="hover:bg-[#00342b]/5 transition-colors group">
                            <td className="px-6 py-4">
                              <div className="font-mono text-[#00affe] font-bold">{b.booking_reference}</div>
                              {isWholeVehicle && (
                                <span className="inline-block mt-1 bg-purple-100 text-purple-800 text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded">Whole Bus</span>
                              )}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#afefdd] flex items-center justify-center text-[#00201a] font-bold text-[12px]">{initials}</div>
                                <div className="flex flex-col">
                                  <span className="text-sm font-semibold text-[#191c1d]">{cust?.name || 'Guest'}</span>
                                  <span className="text-xs text-[#3f4945]">{cust?.phone_number || 'N/A'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                {isWholeVehicle ? (
                                  <>
                                    <span className="text-sm font-medium text-[#191c1d]">Vehicles:</span>
                                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                    <span className="text-xs text-[#3f4945]">{b.booking_vehicles?.map((bv: any) => bv.vehicles?.name).join(', ')}</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-sm font-medium text-[#191c1d]">{originName} → {destName}</span>
                                    <span className="text-xs text-[#3f4945]">{sched?.vehicles?.name} • {formattedTime}</span>
                                  </>
                                )}
                              </div>
                            </td>
                            <td className="px-6 py-4 text-sm text-[#191c1d]">
                              {isWholeVehicle ? (
                                startDateObj && endDateObj ? (
                                  <>
                                    <div className="font-medium">Start: {startDateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                                    <div className="text-xs text-[#3f4945]">End: {endDateObj.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</div>
                                  </>
                                ) : (
                                  <div className="font-medium">{b.travel_date}</div>
                                )
                              ) : (
                                <div className="font-medium">{b.travel_date}</div>
                              )}
                            </td>
                            <td className="px-6 py-4 text-sm text-[#191c1d] text-center font-bold">
                              {isWholeVehicle ? 'Whole Bus' : b.seats_requested}
                            </td>
                            <td className="px-6 py-4">
                              <div className="flex items-center justify-between gap-4">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  b.status === 'approved' ? 'bg-green-100 text-green-700' :
                                    b.status === 'rejected' ? 'bg-red-100 text-red-700' :
                                      'bg-gray-200 text-gray-800'
                                  }`}>
                                  {b.status}
                                </span>
                                <BookingActionButtons
                                  bookingId={b.id}
                                  currentStatus={b.status}
                                  customerPhone={cust?.phone_number}
                                  bookingReference={b.booking_reference}
                                />
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </AnimatedTableBody>
                </table>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

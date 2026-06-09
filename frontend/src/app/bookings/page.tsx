import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import CustomerCancelButton from '@/components/CustomerCancelButton'
import LiveBookingsRefresher from '@/components/LiveBookingsRefresher'

export const dynamic = 'force-dynamic'

export default async function BookingsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: bookings } = await supabase
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
      operator_notes,
      schedules (
        departure_time,
        vehicles (
          name,
          registration_number,
          owner_id,
          users!vehicles_owner_id_fkey ( phone_number, name )
        ),
        routes (
          origin:locations!routes_origin_id_fkey ( name ),
          destination:locations!routes_destination_id_fkey ( name )
        )
      ),
      booking_vehicles (
        vehicles (
          name,
          registration_number,
          owner_id,
          users!vehicles_owner_id_fkey ( phone_number, name )
        )
      )
    `)
    .eq('customer_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  return (
    <div className="min-h-screen bg-[#f8fafb] py-10 px-4 sm:px-6 lg:px-8 pt-24">
      <LiveBookingsRefresher />
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-extrabold text-[#00342b] mb-8">My Bookings</h1>

        {(!bookings || bookings.length === 0) ? (
          <div className="glass-card rounded-3xl border border-white/60 p-16 text-center flex flex-col items-center justify-center luminous-shadow relative overflow-hidden mt-8">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#004d40] to-[#00affe]"></div>
            <div className="w-24 h-24 bg-gradient-to-br from-[#e2f1ec] to-white rounded-full flex items-center justify-center mb-6 shadow-[0_8px_16px_rgba(0,175,254,0.1)] border border-white/80 hover:-translate-y-2 transition-transform duration-500 cursor-default">
              <span className="material-symbols-outlined text-[48px] text-[#00affe]">confirmation_number</span>
            </div>
            <h3 className="text-2xl font-bold text-[#00342b] mb-3">No Bookings Yet</h3>
            <p className="text-[#3f4945] mb-8 max-w-sm text-base leading-relaxed">Your upcoming and past bus reservations will appear here. Ready to plan your next journey?</p>
            <Link href="/" className="button-gradient text-white px-8 py-3.5 rounded-xl font-bold shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">search</span> Find a Bus
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {bookings.map((booking: any) => {
              const isWholeVehicle = booking.booking_type === 'whole_vehicle'
              
              // Extract ticket booking info
              const schedule = booking.schedules
              const ticketVehicle = schedule?.vehicles
              const originName = schedule?.routes?.origin?.name || 'Unknown'
              const destName = schedule?.routes?.destination?.name || 'Unknown'
              
              // Extract whole vehicle info
              const bvs = booking.booking_vehicles || []
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const wvVehicles = bvs.map((bv: any) => bv.vehicles).filter(Boolean)
              
              // Pick the first vehicle's operator for WhatsApp contact
              const primaryVehicle = isWholeVehicle ? wvVehicles[0] : ticketVehicle
              const operatorPhone = primaryVehicle?.users?.phone_number
              const operatorName = primaryVehicle?.users?.name || 'Operator'

              // Formatting dates and times
              const travelDateStr = booking.travel_date
              const startDateObj = booking.start_date ? new Date(booking.start_date) : null
              const endDateObj = booking.end_date ? new Date(booking.end_date) : null
              
              let formattedTime = 'Unknown'
              if (schedule?.departure_time) {
                const dt = new Date(schedule.departure_time)
                if (!isNaN(dt.getTime())) {
                  formattedTime = dt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
                } else {
                  formattedTime = schedule.departure_time.substring(0, 5)
                }
              }

              return (
                <div key={booking.id} className="glass-card rounded-2xl border border-white/50 overflow-hidden luminous-shadow hover:shadow-[0_20px_40px_-10px_rgba(0,77,64,0.12)] transition-shadow duration-300">
                  <div className="p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-bold uppercase tracking-wider text-gray-500">Booking Reference</span>
                          {isWholeVehicle && (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full font-semibold">Whole Bus</span>
                          )}
                        </div>
                        <h2 className="text-xl font-mono font-bold text-gray-900">{booking.booking_reference}</h2>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${
                          booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800 border border-yellow-200' : 
                          booking.status === 'approved' ? 'bg-green-100 text-green-800 border border-green-200' : 
                          'bg-gray-100 text-gray-800 border border-gray-200'
                        }`}>
                          {booking.status}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4 border-t border-b border-[#bfc9c4]/30 my-4">
                      {isWholeVehicle ? (
                        <>
                          <div className="md:col-span-2">
                            <div className="text-sm text-gray-500 mb-1">Booked Vehicles</div>
                            <div className="font-semibold text-gray-900">
                              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                              {wvVehicles.map((v: any) => `${v.name} (${v.registration_number})`).join(', ')}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Start Date</div>
                            <div className="font-semibold text-gray-900">
                              {startDateObj ? startDateObj.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">End Date</div>
                            <div className="font-semibold text-gray-900">
                              {endDateObj ? endDateObj.toLocaleDateString('en-IN', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) : 'Unknown'}
                            </div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Route</div>
                            <div className="font-semibold text-gray-900">{originName} → {destName}</div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Vehicle</div>
                            <div className="font-semibold text-gray-900">{ticketVehicle?.name} <span className="text-gray-500 font-mono text-sm ml-2">{ticketVehicle?.registration_number}</span></div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Departure</div>
                            <div className="font-semibold text-gray-900">{travelDateStr} <span className="text-gray-500 ml-2">{formattedTime}</span></div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500 mb-1">Seats Reserved</div>
                            <div className="font-semibold text-gray-900">{booking.seats_requested}</div>
                          </div>
                        </>
                      )}
                    </div>

                    {booking.operator_notes && (
                      <div className="mb-4 bg-[#004d40]/5 rounded-xl p-4 border border-[#004d40]/10 shadow-sm">
                        <h4 className="text-sm font-bold text-[#00342b] mb-1">Note from Operator</h4>
                        <p className="text-sm text-[#3f4945]">{booking.operator_notes}</p>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6">
                      <CustomerCancelButton bookingId={booking.id} status={booking.status} />
                      
                      {operatorPhone && (
                        <a 
                          href={`https://wa.me/${operatorPhone.replace('+', '')}?text=Hi ${operatorName}, I am contacting you regarding my booking ${booking.booking_reference}.`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-sm font-medium text-green-600 hover:text-green-800"
                        >
                          <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
                          Contact {operatorName}
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

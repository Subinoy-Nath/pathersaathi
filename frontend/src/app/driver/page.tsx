'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { playTripStartCue } from '@/utils/audio'
import {
  Bus,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCw,
  LogOut,
  Navigation,
  Wifi,
  WifiOff,
  Radio
} from 'lucide-react'

interface ScheduleTrip {
  id: string
  status: string
  departure_time: string
  arrival_time: string
  total_seats: number
  available_seats: number
  vehicle?: {
    id: string
    name: string
    registration_number: string
    capacity: number
  } | null
  route?: {
    id: string
    originName: string
    destName: string
  } | null
  bookedPassengers: number
}

export default function DriverCockpitPage() {
  const router = useRouter()
  const [trips, setTrips] = useState<ScheduleTrip[]>([])
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [starting, setStarting] = useState(false)
  const [driverName, setDriverName] = useState<string>('Driver')
  const [gpsReady, setGpsReady] = useState(false)
  const [wakeLockReady] = useState<boolean>(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator)
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  // Hardware capability check
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        () => setGpsReady(true),
        () => setGpsReady(false),
        { timeout: 5000 }
      )
    }

    const onOnline = () => setIsOnline(true)
    const onOffline = () => setIsOnline(false)
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)

    return () => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  const [refreshKey, setRefreshKey] = useState(0)

  // Fetch driver assigned schedules
  useEffect(() => {
    let isMounted = true

    async function fetchSchedules() {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/driver/login')
          return
        }

        // Fetch user profile name
        const { data: profile } = await supabase
          .from('users')
          .select('name, role')
          .eq('id', user.id)
          .single()

        if (profile?.name && isMounted) {
          setDriverName(profile.name)
        }

        // Fetch schedules assigned to driver or active today
        const { data: schedulesData, error: schedError } = await supabase
          .from('schedules')
          .select(`
            id,
            status,
            departure_time,
            arrival_time,
            total_seats,
            available_seats,
            driver_id,
            vehicles (
              id,
              name,
              registration_number,
              capacity
            ),
            routes (
              id,
              origin:locations!routes_origin_id_fkey(name),
              destination:locations!routes_destination_id_fkey(name)
            )
          `)
          .in('status', ['scheduled', 'in_transit'])
          .order('departure_time', { ascending: true })
          .limit(10)

        if (schedError) throw schedError

        // Fetch booked passenger counts
        const formattedTrips: ScheduleTrip[] = await Promise.all(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (schedulesData || []).map(async (s: any) => {
            const { count } = await supabase
              .from('bookings')
              .select('*', { count: 'exact', head: true })
              .eq('schedule_id', s.id)
              .eq('status', 'approved')

            return {
              id: s.id,
              status: s.status,
              departure_time: s.departure_time,
              arrival_time: s.arrival_time,
              total_seats: s.total_seats,
              available_seats: s.available_seats,
              vehicle: s.vehicles,
              route: s.routes
                ? {
                    id: s.routes.id,
                    originName: s.routes.origin?.name || 'Unknown',
                    destName: s.routes.destination?.name || 'Unknown'
                  }
                : null,
              bookedPassengers: count || 0
            }
          })
        )

        if (isMounted) {
          setTrips(formattedTrips)
          setError(null)

          // Auto-select first in_transit or scheduled trip
          const inTransitTrip = formattedTrips.find(t => t.status === 'in_transit')
          if (inTransitTrip) {
            setSelectedTripId(inTransitTrip.id)
          } else if (formattedTrips.length > 0) {
            setSelectedTripId(formattedTrips[0].id)
          }
        }
      } catch (err: unknown) {
        console.error('Failed to load trips:', err)
        if (isMounted) {
          setError(err instanceof Error ? err.message : 'ট্রিপ তালিকা লোড করতে ব্যর্থ / Failed to load trips')
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchSchedules()

    return () => {
      isMounted = false
    }
  }, [supabase, router, refreshKey])

  const handleRefresh = () => {
    setLoading(true)
    setRefreshKey(prev => prev + 1)
  }

  // Start or resume trip
  const handleStartTrip = async (scheduleId: string) => {
    setStarting(true)
    setError(null)

    try {
      // 1. If not already in_transit, call atomic RPC
      const trip = trips.find(t => t.id === scheduleId)
      if (trip && trip.status !== 'in_transit') {
        const { data, error: rpcError } = await supabase.rpc('driver_start_trip', {
          p_schedule_id: scheduleId
        })

        if (rpcError) {
          throw new Error(rpcError.message || 'ট্রিপ শুরু করা যায়নি / Could not start trip')
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = data as any
        if (result && result.success === false) {
          throw new Error(result.error || 'ট্রিপ শুরু করার অনুমতি নেই / Authorization failed')
        }
      }

      // 2. Play audio launch chime & vibration
      playTripStartCue()

      // 3. Navigate to active HUD
      router.push(`/driver/trip/${scheduleId}`)
    } catch (err: unknown) {
      console.error('Error starting trip:', err)
      const msg = err instanceof Error ? err.message : 'ব্যর্থ হয়েছে / Operation failed'
      setError(msg)
      setStarting(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/driver/login')
  }

  const activeTrip = trips.find(t => t.id === selectedTripId) || trips[0]

  return (
    <div className="min-h-screen bg-[#001712] text-white flex flex-col p-4 sm:p-6 max-w-xl mx-auto w-full">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-4 border-b border-[#004d40]/40">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#00E676]/15 border border-[#00E676]/40 flex items-center justify-center text-[#00E676]">
            <Bus className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-white/60 uppercase tracking-wider font-semibold">
              চালক ককপিট / Driver Cockpit
            </div>
            <div className="text-base font-bold text-white flex items-center gap-2">
              <span>{driverName}</span>
              <span className="text-[10px] bg-[#00E676]/20 text-[#00E676] px-2 py-0.5 rounded-full font-mono">
                CABIN
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-xl bg-[#002B22] border border-[#004D40] text-[#00E676] hover:bg-[#00382d] active:scale-95"
            title="Refresh"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="p-2 rounded-xl bg-[#002B22] border border-[#004D40] text-red-400 hover:bg-red-950/40 active:scale-95"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Connectivity & Hardware Status Ticker */}
      <div className="grid grid-cols-3 gap-2 my-4">
        <div className="bg-[#002B22] border border-[#004D40]/50 rounded-xl p-2.5 flex items-center gap-2">
          {isOnline ? (
            <Wifi className="w-4 h-4 text-[#00E676]" />
          ) : (
            <WifiOff className="w-4 h-4 text-[#FFB300]" />
          )}
          <span className="text-[11px] font-bold">
            {isOnline ? '4G Online' : 'Offline'}
          </span>
        </div>

        <div className="bg-[#002B22] border border-[#004D40]/50 rounded-xl p-2.5 flex items-center gap-2">
          <Navigation className={`w-4 h-4 ${gpsReady ? 'text-[#00E676]' : 'text-[#FFB300]'}`} />
          <span className="text-[11px] font-bold">
            {gpsReady ? 'GPS Ready' : 'Acquiring GPS'}
          </span>
        </div>

        <div className="bg-[#002B22] border border-[#004D40]/50 rounded-xl p-2.5 flex items-center gap-2">
          <Radio className={`w-4 h-4 ${wakeLockReady ? 'text-[#00E676]' : 'text-white/40'}`} />
          <span className="text-[11px] font-bold">
            {wakeLockReady ? 'Wake Lock' : 'Normal Lock'}
          </span>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="mb-4 bg-red-950/70 border border-red-500/50 rounded-2xl p-4 flex items-start gap-3 text-red-200 text-sm">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="font-bold">{error}</p>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col justify-between">
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-white/60">
            <div className="w-10 h-10 border-3 border-[#00E676]/30 border-t-[#00E676] rounded-full animate-spin mb-3" />
            <p className="text-sm font-bold text-[#00E676]">আজকের ট্রিপ লোড হচ্ছে...</p>
            <p className="text-xs text-white/40 mt-1">Fetching scheduled runs...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#002B22]/60 rounded-3xl border border-[#004D40] my-4">
            <Bus className="w-16 h-16 text-white/30 mb-4" />
            <h3 className="text-lg font-bold text-white mb-1">
              আজকের কোনো ট্রিপ নির্ধারিত নেই
            </h3>
            <p className="text-xs text-white/60 max-w-xs mb-6">
              No assigned schedules found for today. Please contact your fleet operator in Silchar.
            </p>
            <button
              type="button"
              onClick={handleRefresh}
              className="px-6 py-3 bg-[#00E676]/15 border border-[#00E676]/40 text-[#00E676] rounded-xl text-sm font-bold flex items-center gap-2"
            >
              <RotateCw className="w-4 h-4" /> রিফ্রেশ করুন / Refresh
            </button>
          </div>
        ) : (
          <div className="space-y-4 my-2">
            {/* Run Selection if multiple */}
            {trips.length > 1 && (
              <div>
                <label className="text-xs font-bold text-[#00E676] uppercase tracking-wider block mb-2">
                  নির্ধারিত ট্রিপ নির্বাচন করুন / Select Assigned Run:
                </label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                  {trips.map(t => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTripId(t.id)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap border transition-all ${
                        t.id === (activeTrip?.id)
                          ? 'bg-[#00E676] text-black border-[#00E676]'
                          : 'bg-[#002B22] text-white/80 border-[#004D40] hover:border-[#00E676]/50'
                      }`}
                    >
                      {t.status === 'in_transit' && '● '}
                      {t.route ? `${t.route.originName} → ${t.route.destName}` : t.id.slice(0, 8)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Run Card */}
            {activeTrip && (
              <div className="bg-[#002B22] border-2 border-[#00E676]/40 rounded-3xl p-5 shadow-[0_10px_30px_rgba(0,0,0,0.5)] relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00E676] to-[#00affe]" />

                {/* Status Badge */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-[#00E676] uppercase tracking-wider">
                    আজকের নির্ধারিত ট্রিপ / RUN CARD
                  </span>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-extrabold uppercase tracking-wide flex items-center gap-1.5 ${
                    activeTrip.status === 'in_transit'
                      ? 'bg-[#00E676] text-black animate-pulse'
                      : 'bg-white/10 text-white border border-white/20'
                  }`}>
                    {activeTrip.status === 'in_transit' ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-black" />
                        চলমান / IN TRANSIT
                      </>
                    ) : (
                      'নির্ধারিত / SCHEDULED'
                    )}
                  </span>
                </div>

                {/* Route Header */}
                <div className="mb-4">
                  <div className="text-xs text-white/50 mb-1 flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-[#00E676]" /> রুট / ROUTE:
                  </div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white flex items-center gap-2 flex-wrap">
                    <span>{activeTrip.route?.originName || 'Silchar ISBT'}</span>
                    <span className="text-[#00E676]">───➔</span>
                    <span>{activeTrip.route?.destName || 'Sribhumi'}</span>
                  </div>
                </div>

                {/* Vehicle & Time Grid */}
                <div className="grid grid-cols-2 gap-3 py-3 border-t border-b border-[#004D40]/60 my-3">
                  <div>
                    <div className="text-[11px] text-white/50 mb-0.5">গাড়ি / BUS:</div>
                    <div className="font-bold text-white text-base">
                      {activeTrip.vehicle?.name || 'Superfast Coach'}
                    </div>
                    <div className="font-mono text-xs text-[#00E676]">
                      {activeTrip.vehicle?.registration_number || 'AS-10-DC-XXXX'}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] text-white/50 mb-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#00E676]" /> ছাড়ার সময় / DEPARTURE:
                    </div>
                    <div className="font-bold text-white text-base">
                      {new Date(activeTrip.departure_time).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                      })}
                    </div>
                    <div className="text-xs text-white/50">
                      {new Date(activeTrip.departure_time).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short'
                      })}
                    </div>
                  </div>
                </div>

                {/* Passengers count */}
                <div className="flex items-center justify-between text-xs text-white/80 py-1">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <Users className="w-4 h-4 text-[#00E676]" /> যাত্রী বুকিং / Booked:
                  </span>
                  <span className="font-mono font-bold text-base text-[#00E676]">
                    {activeTrip.bookedPassengers} জন
                  </span>
                </div>

                {/* Checklist Summary */}
                <div className="mt-4 pt-3 border-t border-[#004D40]/60 space-y-1.5 text-xs text-white/70">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                    <span>অবস্থান সনাক্তকরণ প্রস্তুত (GPS Watcher Ready)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#00E676]" />
                    <span>স্ক্রিন লক নিয়ন্ত্রণ সক্ষম (Wake Lock Ready)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Massive START / RESUME TRIP Button (80px height) */}
        {activeTrip && (
          <div className="pt-4 pb-2 space-y-3">
            <button
              type="button"
              disabled={starting}
              onClick={() => handleStartTrip(activeTrip.id)}
              className="w-full h-[80px] bg-[#00E676] hover:bg-[#00c864] active:scale-[0.98] text-black font-extrabold text-xl sm:text-2xl rounded-3xl flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(0,230,118,0.4)] transition-all cursor-pointer disabled:opacity-50"
            >
              {starting ? (
                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 border-4 border-black border-t-transparent rounded-full animate-spin" />
                  <span>ট্রিপ শুরু হচ্ছে...</span>
                </div>
              ) : activeTrip.status === 'in_transit' ? (
                <>
                  <Navigation className="w-8 h-8 animate-pulse" />
                  <span>ট্রিপে ফিরে যান / RESUME HUD</span>
                </>
              ) : (
                <>
                  <Play className="w-8 h-8 fill-black" />
                  <span>যাত্রা শুরু করুন / START TRIP</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-white/50 font-medium">
              ⚠️ গাড়ি চালানোর সময় ফোনে হাত দেবেন না • Keep phone mounted during transit
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

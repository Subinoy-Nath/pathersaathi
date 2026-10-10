'use client'

import React, { useState, useEffect, use } from 'react'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { useLiveBusTracking } from '@/hooks/useLiveBusTracking'
import LiveBusMap from '@/components/map/LiveBusMap'
import {
  ArrowLeft,
  Bus,
  MapPin,
  Clock,
  Gauge,
  AlertTriangle,
  Radio,
  ChevronDown,
  ChevronUp
} from 'lucide-react'

// Coordinates lookup for Barak Valley regional transit hubs
const REGIONAL_COORDINATES: Record<string, { lat: number; lng: number }> = {
  'silchar': { lat: 24.8333, lng: 92.7789 },
  'silchar isbt': { lat: 24.8350, lng: 92.7750 },
  'karimganj': { lat: 24.8698, lng: 92.3586 },
  'sribhumi': { lat: 24.8698, lng: 92.3586 },
  'sribhumi central': { lat: 24.8700, lng: 92.3600 },
  'hailakandi': { lat: 24.6811, lng: 92.5647 },
  'badarpur': { lat: 24.8966, lng: 92.5732 },
  'badarpur ghat': { lat: 24.8966, lng: 92.5732 },
  'kalain': { lat: 24.9750, lng: 92.5730 },
  'algapur': { lat: 24.7700, lng: 92.6500 },
  'katigorah': { lat: 24.9500, lng: 92.6000 },
  'lala': { lat: 24.5500, lng: 92.6000 },
  'patherkandi': { lat: 24.6340, lng: 92.3270 },
  'lowairpoa': { lat: 24.4710, lng: 92.2980 },
  'bazarichera': { lat: 24.4980, lng: 92.3480 },
  'kotamoni': { lat: 24.4420, lng: 92.2750 }
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function getCoordsForLocation(name: string, fallbackLat: number, fallbackLng: number) {
  const clean = name.toLowerCase().trim()
  for (const [key, val] of Object.entries(REGIONAL_COORDINATES)) {
    if (clean.includes(key) || key.includes(clean)) {
      return val
    }
  }
  return { lat: fallbackLat, lng: fallbackLng }
}

export default function PassengerTrackBusPage({
  params
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const resolvedParams = use(params)
  const scheduleId = resolvedParams.scheduleId
  const supabase = createClient()

  // Realtime Live Bus Tracking Hook
  const {
    currentLocation,
    historyCoordinates,
    isLive,
    secondsSinceLastPing,
    tripStatus,
    pauseReason
  } = useLiveBusTracking(scheduleId)

  // Schedule metadata state
  interface StationTime {
    name: string
    stop_order: number
    time: string // "HH:MM"
  }

  interface RouteStop {
    stop_order: number
    name: string // resolved from location or custom_name
  }

  interface MetaData {
    vehicleName: string
    vehicleReg: string
    isAC: boolean
    originName: string
    destName: string
    departureTime: string
    arrivalTime: string
    routeStops: RouteStop[]         // intermediate stops in order
    stationTimes: StationTime[]     // per-station scheduled times from schedules.station_times
    operatorNotes: string | null
  }

  const isInvalidUuid = !scheduleId || !UUID_REGEX.test(scheduleId)
  const [meta, setMeta] = useState<MetaData | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(!isInvalidUuid)
  const [metaNotFound, setMetaNotFound] = useState(isInvalidUuid)
  // Controls whether intermediate stops are expanded
  const [stopsOpen, setStopsOpen] = useState(false)

  useEffect(() => {
    if (isInvalidUuid) return
    let isMounted = true

    const loadMetadata = async () => {
      try {
        const { data: sched, error } = await supabase
          .from('schedules')
          .select(`
            id,
            departure_time,
            arrival_time,
            station_times,
            pause_reason,
            vehicles (
              name,
              registration_number,
              is_ac,
              features,
              owner_id,
              users!vehicles_owner_id_fkey ( phone_number, name )
            ),
            routes (
              origin:locations!routes_origin_id_fkey ( name ),
              destination:locations!routes_destination_id_fkey ( name ),
              route_stops (
                stop_order,
                custom_name,
                location:locations ( name )
              )
            )
          `)
          .eq('id', scheduleId)
          .single()

        if (error || !sched) {
          console.error('Error fetching schedule metadata:', error)
          if (isMounted) setMetaNotFound(true)
          return
        }

        if (isMounted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = sched.vehicles as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = sched.routes as any

          // Determine AC status: match the same logic used in actions.ts —
          // trust is_ac column first, then fall back to features text
          // (some vehicles have features="AC" but is_ac not yet migrated to true)
          const featuresText: string = v?.features || ''
          const isACFromFeatures = featuresText.includes('AC') && !featuresText.includes('Non-AC')
          const isAC: boolean = v?.is_ac === true || isACFromFeatures

          // Resolve intermediate stops: sort by stop_order, resolve name
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const rawStops: RouteStop[] = ((r?.route_stops as any[]) || [])
            .map((s: any) => ({
              stop_order: s.stop_order,
              name: s.location?.name || s.custom_name || `Stop ${s.stop_order}`
            }))
            .sort((a: RouteStop, b: RouteStop) => a.stop_order - b.stop_order)

          // Station times come directly from JSONB on the schedule
          const rawStationTimes: StationTime[] = Array.isArray(sched.station_times)
            ? (sched.station_times as unknown as StationTime[])
            : []

          setMeta({
            vehicleName: v?.name || 'Bus',
            vehicleReg: v?.registration_number || 'AS-10',
            isAC,
            originName: r?.origin?.name || 'Silchar',
            destName: r?.destination?.name || 'Sribhumi',
            departureTime: sched.departure_time,
            arrivalTime: sched.arrival_time,
            routeStops: rawStops,
            stationTimes: rawStationTimes,
            operatorNotes: sched.pause_reason
          })
        }
      } catch (err) {
        console.error('Metadata fetch failed:', err)
        if (isMounted) setMetaNotFound(true)
      } finally {
        if (isMounted) setLoadingMeta(false)
      }
    }

    loadMetadata()

    return () => {
      isMounted = false
    }
  }, [scheduleId]) // eslint-disable-line react-hooks/exhaustive-deps

  // Resolve Map Points
  const originName = meta?.originName || 'Silchar ISBT'
  const destName = meta?.destName || 'Sribhumi Central'
  const originCoords = getCoordsForLocation(originName, 24.8333, 92.7789)
  const destCoords = getCoordsForLocation(destName, 24.8698, 92.3586)

  const routeOrigin = { name: originName, lat: originCoords.lat, lng: originCoords.lng }
  const routeDestination = { name: destName, lat: destCoords.lat, lng: destCoords.lng }

  if (loadingMeta) {
    return (
      <div className="min-h-screen bg-[#f8fafb] py-8 px-4 sm:px-6 lg:px-8 pt-24 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-3 border-[#004D40]/30 border-t-[#004D40] rounded-full animate-spin mb-3" />
        <p className="text-sm font-bold text-[#004D40]">ট্রিপের তথ্য লোড হচ্ছে... / Loading Trip Telemetry</p>
      </div>
    )
  }

  if (metaNotFound) {
    return (
      <div className="min-h-screen bg-[#f8fafb] py-8 px-4 sm:px-6 lg:px-8 pt-24 flex flex-col items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-gray-200 shadow-md text-center space-y-4">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-black text-[#00342b]">
            সময়সূচী পাওয়া যায়নি / Schedule Not Found
          </h2>
          <p className="text-sm text-[#3f4945] leading-relaxed">
            The bus schedule you are trying to track was not found or is no longer available.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-[#004D40] text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow hover:bg-[#00382d] transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>হোমপেজে ফিরে যান / Back to Home</span>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f8fafb] py-8 px-4 sm:px-6 lg:px-8 pt-24">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#004D40] hover:text-[#00affe] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>হোম / Home</span>
            </Link>
            <span className="text-gray-300">|</span>
            <Link
              href="/bookings"
              className="inline-flex items-center gap-1 text-sm font-bold text-[#004D40] hover:text-[#00affe] transition-colors"
            >
              <span>বুকিং তালিকা / Bookings</span>
            </Link>
          </div>


          {/* Pulse Status Badge */}
          <div className="flex items-center gap-2 bg-white border border-[#004D40]/20 px-3 py-1.5 rounded-full shadow-sm text-xs font-semibold">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                tripStatus === 'in_transit' && isLive
                  ? 'bg-[#00E676] animate-pulse'
                  : tripStatus === 'completed'
                  ? 'bg-blue-500'
                  : tripStatus === 'cancelled'
                  ? 'bg-rose-500'
                  : tripStatus === 'paused'
                  ? 'bg-amber-500 animate-pulse'
                  : tripStatus === 'boarding'
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
            />
            <span className="text-[#00342b]">
              {tripStatus === 'in_transit'
                ? isLive
                  ? 'লাইভ ট্র্যাকিং সক্রিয় / LIVE'
                  : 'সিগন্যাল বিরতি / SIGNAL PAUSED'
                : tripStatus === 'paused'
                ? 'সাময়িক বিরতি / TRIP PAUSED'
                : tripStatus === 'boarding'
                ? 'বোর্ডিং চলছে / BOARDING'
                : tripStatus === 'completed'
                ? 'যাত্রা সমাপ্ত / COMPLETED'
                : tripStatus === 'cancelled'
                ? 'বাতিল করা হয়েছে / CANCELLED'
                : 'নির্ধারিত / SCHEDULED'}
            </span>
          </div>
        </div>

        {/* Bus and Route Header Card — full route timeline */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#004D40] via-[#00affe] to-[#00E676]" />

          {/* Vehicle badge row */}
          <div className="flex items-center gap-2 flex-wrap mb-5">
            <div className="flex items-center gap-2 text-xs font-bold text-[#004D40] uppercase tracking-wider">
              <Bus className="w-4 h-4" />
              <span>{meta?.vehicleName || 'Transit Coach'}</span>
            </div>
            <span className="bg-[#004D40]/10 text-[#00342b] font-mono px-2 py-0.5 rounded-md text-[11px] font-bold">
              {meta?.vehicleReg || 'AS-10-DC-5047'}
            </span>
            {meta !== null && (
              <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                meta.isAC
                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}>
                {meta.isAC ? '❄️ AC' : 'Non-AC'}
              </span>
            )}
          </div>

          {/* Route timeline: Origin → Stops → Destination */}
          {(() => {
            const stationLookup = new Map(
              (meta?.stationTimes ?? []).map(s => [s.name.toLowerCase().trim(), s.time])
            )

            const formatISO = (iso: string) =>
              new Date(iso).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
                timeZone: 'Asia/Kolkata'
              })

            const resolveTime = (name: string): string | null => {
              const key = name.toLowerCase().trim()
              if (stationLookup.has(key)) return stationLookup.get(key)!
              for (const [k, v] of stationLookup) {
                if (key.includes(k) || k.includes(key)) return v
              }
              return null
            }

            type Stop = { name: string; time: string | null; isOrigin?: boolean; isDestination?: boolean }

            const stops: Stop[] = [
              {
                name: originName,
                time: meta?.departureTime ? formatISO(meta.departureTime) : resolveTime(originName),
                isOrigin: true
              },
              ...(meta?.routeStops ?? []).map(s => ({
                name: s.name,
                time: resolveTime(s.name)
              })),
              {
                name: destName,
                time: meta?.arrivalTime ? formatISO(meta.arrivalTime) : resolveTime(destName),
                isDestination: true
              }
            ]

            // Separate origin/destination from intermediate stops
            const origin = stops[0]
            const destination = stops[stops.length - 1]
            const intermediates = stops.slice(1, -1)

            const StopRow = ({ stop, isFirst, isLast, showConnector }: {
              stop: Stop; isFirst: boolean; isLast: boolean; showConnector: boolean
            }) => {
              const dotCls = isFirst
                ? 'bg-[#004D40] border-[#004D40]'
                : isLast
                ? 'bg-[#d32f2f] border-[#d32f2f]'
                : 'bg-white border-[#00affe]'
              const nameCls = isFirst
                ? 'text-[#004D40] font-extrabold text-base'
                : isLast
                ? 'text-[#d32f2f] font-extrabold text-base'
                : 'text-[#00342b] font-semibold text-sm'
              const timeCls = isFirst || isLast
                ? 'text-gray-900 font-extrabold text-sm'
                : 'text-gray-500 font-semibold text-xs'

              return (
                <div className="flex items-stretch gap-4">
                  <div className="flex flex-col items-center w-4 shrink-0 pt-1">
                    <div className={`w-3.5 h-3.5 rounded-full border-2 shadow-sm shrink-0 ${dotCls}`} />
                    {showConnector && (
                      <div className="w-px flex-1 bg-gradient-to-b from-[#004D40]/25 to-[#00affe]/20 my-1" />
                    )}
                  </div>
                  <div className={`flex items-start justify-between w-full gap-3 ${showConnector ? 'pb-3' : 'pb-0'}`}>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={nameCls}>{stop.name}</span>
                      {isFirst && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-[#004D40]/10 text-[#004D40] px-1.5 py-0.5 rounded">
                          Origin
                        </span>
                      )}
                      {isLast && (
                        <span className="text-[9px] font-bold uppercase tracking-wider bg-red-50 text-[#d32f2f] px-1.5 py-0.5 rounded">
                          Destination
                        </span>
                      )}
                    </div>
                    <span className={`font-mono shrink-0 ${timeCls}`}>
                      {stop.time ?? '—'}
                    </span>
                  </div>
                </div>
              )
            }

            return (
              <div className="flex flex-col">
                {/* Always show origin */}
                <StopRow stop={origin} isFirst={true} isLast={false} showConnector={true} />

                {/* Intermediate stops — toggle */}
                {intermediates.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStopsOpen(o => !o)}
                      className="flex items-center gap-1.5 self-start ml-8 mb-2 text-[11px] font-bold text-[#00affe] hover:text-[#004D40] transition-colors"
                    >
                      {stopsOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {stopsOpen
                        ? 'Hide intermediate stops'
                        : `${intermediates.length} intermediate stop${intermediates.length > 1 ? 's' : ''}`}
                    </button>

                    {stopsOpen && (
                      <div className="flex flex-col ml-0">
                        {intermediates.map((stop, i) => (
                          <StopRow
                            key={i}
                            stop={stop}
                            isFirst={false}
                            isLast={false}
                            showConnector={true}
                          />
                        ))}
                      </div>
                    )}

                    {/* Connecting line to destination when collapsed */}
                    {!stopsOpen && (
                      <div className="flex items-stretch gap-4 mb-0">
                        <div className="flex flex-col items-center w-4 shrink-0">
                          <div className="w-px flex-1 bg-gradient-to-b from-[#00affe]/20 to-[#d32f2f]/25 h-4" />
                        </div>
                        <div className="flex-1" />
                      </div>
                    )}
                  </>
                )}

                {/* Always show destination */}
                <StopRow stop={destination} isFirst={false} isLast={true} showConnector={false} />
              </div>
            )
          })()}
        </div>

        {/* Driver / Operator Alert Banner if present */}
        {(pauseReason ?? meta?.operatorNotes) && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-sm shadow-sm animate-fadeIn">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-amber-950">ড্রাইভার / অপারেটর বার্তা (Operator Update)</h4>
              <p className="text-xs sm:text-sm text-amber-800 mt-0.5">{pauseReason ?? meta?.operatorNotes}</p>
            </div>
          </div>
        )}

        {/* Dynamic Leaflet Map Component */}
        <div className="shadow-2xl rounded-3xl overflow-hidden border border-gray-200">
          <LiveBusMap
            scheduleId={scheduleId}
            vehicleName={meta?.vehicleName}
            vehicleRegistration={meta?.vehicleReg}
            routeOrigin={routeOrigin}
            routeDestination={routeDestination}
            currentLocation={currentLocation}
            historyCoordinates={historyCoordinates}
            isLive={isLive}
          />
        </div>

        {/* Telemetry HUD */}
        <div className="grid grid-cols-1 gap-4">
          {/* Real-time Telemetry Metrics */}
          <div className="glass-card rounded-2xl p-5 border border-white/60 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-[#004D40] uppercase tracking-wider flex items-center gap-1.5">
              <Radio className="w-4 h-4 text-[#00affe]" />
              বোর্ডিং ও লাইভ অবস্থান / TELEMETRY STATUS
            </h3>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-[#f0f9f6] border border-[#004D40]/10 rounded-xl p-3">
                <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mb-1">
                  <Gauge className="w-3.5 h-3.5 text-[#004D40]" /> বর্তমান গতি / Speed
                </div>
                <div className="text-2xl font-black text-[#00342b] font-mono">
                  {currentLocation?.speed !== null && currentLocation?.speed !== undefined
                    ? `${Math.round(currentLocation.speed)} km/h`
                    : '০ km/h'}
                </div>
              </div>

              <div className="bg-[#f0f9f6] border border-[#004D40]/10 rounded-xl p-3">
                <div className="text-[11px] text-gray-500 font-medium flex items-center gap-1 mb-1">
                  <Clock className="w-3.5 h-3.5 text-[#004D40]" /> শেষ আপডেট / Freshness
                </div>
                <div className="text-sm font-bold text-[#00342b] font-mono mt-1.5">
                  {secondsSinceLastPing >= 0 && currentLocation ? (
                    secondsSinceLastPing <= 10
                      ? `${secondsSinceLastPing}s আগে (Live)`
                      : `${secondsSinceLastPing}s ago`
                  ) : (
                    'সংকেত অপেক্ষমান / Waiting for GPS'
                  )}
                </div>
              </div>
            </div>

            <div className="text-xs text-gray-500 flex items-center gap-1.5 pt-1">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              <span>
                {currentLocation
                  ? `Lat: ${currentLocation.latitude.toFixed(4)}, Lng: ${currentLocation.longitude.toFixed(4)}`
                  : 'বাসের অবস্থান অনুসন্ধান করা হচ্ছে / Searching for GPS fix...'}
              </span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

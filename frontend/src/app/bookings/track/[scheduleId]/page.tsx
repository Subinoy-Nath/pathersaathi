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
  Phone,
  MessageSquare,
  AlertTriangle,
  Radio
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
  interface MetaData {
    vehicleName: string
    vehicleReg: string
    originName: string
    destName: string
    departureTime: string
    operatorPhone: string | null
    operatorName: string | null
    operatorNotes: string | null
  }

  const isInvalidUuid = !scheduleId || !UUID_REGEX.test(scheduleId)
  const [meta, setMeta] = useState<MetaData | null>(null)
  const [loadingMeta, setLoadingMeta] = useState(!isInvalidUuid)
  const [metaNotFound, setMetaNotFound] = useState(isInvalidUuid)

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
            pause_reason,
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
          const owner = v?.users

          setMeta({
            vehicleName: v?.name || 'Bus',
            vehicleReg: v?.registration_number || 'AS-10',
            originName: r?.origin?.name || 'Silchar',
            destName: r?.destination?.name || 'Sribhumi',
            departureTime: sched.departure_time,
            operatorPhone: owner?.phone_number || null,
            operatorName: owner?.name || 'Fleet Operator',
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

        {/* Bus and Route Header Card */}
        <div className="glass-card rounded-3xl p-6 border border-white/60 shadow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#004D40] via-[#00affe] to-[#00E676]" />

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold text-[#004D40] uppercase tracking-wider mb-1">
                <Bus className="w-4 h-4" />
                <span>{meta?.vehicleName || 'Transit Coach'}</span>
                <span className="bg-[#004D40]/10 text-[#00342b] font-mono px-2 py-0.5 rounded-md text-[11px]">
                  {meta?.vehicleReg || 'AS-10-DC-5047'}
                </span>
              </div>
              <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
                <span>{originName}</span>
                <span className="text-[#00affe]">➔</span>
                <span>{destName}</span>
              </h1>
            </div>

            <div className="text-right sm:border-l sm:border-gray-200 sm:pl-6">
              <div className="text-xs text-gray-500 font-semibold mb-1 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#004D40]" /> ছাড়ার সময় / Departure
              </div>
              <div className="text-base font-extrabold text-gray-900 font-mono">
                {meta?.departureTime
                  ? new Date(meta.departureTime).toLocaleTimeString('en-IN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true,
                      timeZone: 'Asia/Kolkata'
                    })
                  : 'Scheduled'}
              </div>
            </div>
          </div>
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

        {/* Telemetry Telemetry HUD & Driver Contact Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          {/* Operator / Driver Contact */}
          <div className="glass-card rounded-2xl p-5 border border-white/60 shadow-sm flex flex-col justify-between space-y-3">
            <div>
              <h3 className="text-xs font-bold text-[#004D40] uppercase tracking-wider mb-2">
                সহায়তা ও অনুসন্ধান / OPERATOR ASSISTANCE
              </h3>
              <p className="text-sm font-bold text-gray-900">{meta?.operatorName || 'Pather Saathi Dispatch'}</p>
              <p className="text-xs text-gray-500">Barak Valley Fleet Controller • Silchar ISBT</p>
            </div>

            <div className="flex gap-2 pt-2">
              {meta?.operatorPhone ? (
                <>
                  <a
                    href={`tel:${meta.operatorPhone.replace(/\s+/g, '')}`}
                    className="flex-1 bg-[#004D40] hover:bg-[#00382d] text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <Phone className="w-3.5 h-3.5" /> কল করুন / Call
                  </a>
                  <a
                    href={`https://wa.me/${meta.operatorPhone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello, I am tracking schedule ${scheduleId} on Pather Saathi.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                  >
                    <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                  </a>
                </>
              ) : (
                <a
                  href="tel:+919435012345"
                  className="w-full bg-[#004D40] text-white py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Phone className="w-3.5 h-3.5" /> হেল্পলাইন / Call Helpline (+91 94350 12345)
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

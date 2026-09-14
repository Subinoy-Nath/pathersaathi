'use client'

import React, { useState, useEffect, useRef, use, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { useScreenWakeLock } from '@/hooks/useScreenWakeLock'
import { useDriverLocation } from '@/hooks/useDriverLocation'
import { offlineBuffer } from '@/utils/offlineGpsBuffer'
import {
  playTripEndCue,
  isAudioMuted,
  setAudioMuted
} from '@/utils/audio'
import {
  Wifi,
  WifiOff,
  Volume2,
  VolumeX,
  Lock,
  MapPin,
  CheckCircle,
  AlertTriangle,
  Compass,
  Coffee,
  AlertOctagon
} from 'lucide-react'

interface ScheduleDetails {
  id: string
  vehicle_id: string
  driver_id: string | null
  status: string
  departure_time: string
  vehicleName: string
  vehicleReg: string
  originName: string
  destName: string
}

export default function DriverTripHUDPage({
  params
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const resolvedParams = use(params)
  const scheduleId = resolvedParams.scheduleId
  const router = useRouter()
  const supabase = createClient()

  // Hardware Hooks
  const wakeLock = useScreenWakeLock()
  const [schedule, setSchedule] = useState<ScheduleDetails | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string>('')
  const [audioMuteState, setAudioMuteState] = useState<boolean>(() => isAudioMuted())
  const [loadingSchedule, setLoadingSchedule] = useState<boolean>(true)
  const [endingTrip, setEndingTrip] = useState<boolean>(false)
  const [quickNoteStatus, setQuickNoteStatus] = useState<string | null>(null)
  const [secondsSinceSync, setSecondsSinceSync] = useState<number>(0)

  // Hold-to-end 2000ms state
  const [holdProgress, setHoldProgress] = useState<number>(0) // 0 to 100%
  const isHoldingRef = useRef<boolean>(false)
  const holdStartTimeRef = useRef<number>(0)
  const animFrameRef = useRef<number | null>(null)

  // Driver Location Hook
  const location = useDriverLocation({
    scheduleId,
    vehicleId: schedule?.vehicle_id || '',
    driverId: currentUserId || schedule?.driver_id || ''
  })

  // Timer for seconds since last sync
  useEffect(() => {
    const interval = setInterval(() => {
      if (location.lastSyncedAt) {
        setSecondsSinceSync(Math.max(0, Math.round((Date.now() - location.lastSyncedAt.getTime()) / 1000)))
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [location.lastSyncedAt])

  // Initialize Screen Wake Lock
  useEffect(() => {
    wakeLock.requestLock()

    return () => {
      wakeLock.releaseLock()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Load Schedule & Vehicle Details
  useEffect(() => {
    let isMounted = true

    const loadData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/driver/login')
          return
        }
        if (isMounted) setCurrentUserId(user.id)

        const { data: schedData, error } = await supabase
          .from('schedules')
          .select(`
            id,
            vehicle_id,
            driver_id,
            status,
            departure_time,
            vehicles (
              name,
              registration_number
            ),
            routes (
              origin:locations!routes_origin_id_fkey ( name ),
              destination:locations!routes_destination_id_fkey ( name )
            )
          `)
          .eq('id', scheduleId)
          .single()

        if (error || !schedData) {
          console.error('Schedule fetch error:', error)
          router.push('/driver')
          return
        }

        if (isMounted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = schedData.vehicles as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = schedData.routes as any

          setSchedule({
            id: schedData.id,
            vehicle_id: schedData.vehicle_id,
            driver_id: schedData.driver_id,
            status: schedData.status,
            departure_time: schedData.departure_time,
            vehicleName: v?.name || 'Bus',
            vehicleReg: v?.registration_number || 'AS-10-XXXX',
            originName: r?.origin?.name || 'Origin',
            destName: r?.destination?.name || 'Destination'
          })
          setLoadingSchedule(false)
        }
      } catch (err) {
        console.error('Failed to initialize driver HUD:', err)
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
  }, [scheduleId, supabase, router])

  // Automatically begin GPS tracking once schedule data is ready
  useEffect(() => {
    if (schedule?.vehicle_id && !location.isTracking) {
      location.startTracking()
    }
  }, [schedule, location])

  // Toggle Audio Mute
  const toggleAudio = () => {
    const next = !audioMuteState
    setAudioMuteState(next)
    setAudioMuted(next)
  }

  // Quick Action Buttons (Rest Stop, Traffic Delay)
  const handleBroadcastQuickNote = async (note: string) => {
    try {
      setQuickNoteStatus(note)
      await supabase
        .from('schedules')
        .update({ pause_reason: `Driver Update: ${note}` })
        .eq('id', scheduleId)

      setTimeout(() => setQuickNoteStatus(null), 3000)
    } catch (err) {
      console.warn('Failed to post driver note:', err)
    }
  }

  // Finish Trip Procedure (called when 2000ms hold is completed)
  const completeTrip = useCallback(async () => {
    setEndingTrip(true)
    location.stopTracking()

    try {
      // 1. Flush any pending offline buffer points
      await offlineBuffer.replayAll(supabase)

      // 2. Call atomic driver_end_trip RPC
      const { data, error } = await supabase.rpc('driver_end_trip', {
        p_schedule_id: scheduleId
      })

      if (error) {
        console.error('RPC driver_end_trip error:', error)
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const res = data as any
      if (res && res.success === false) {
        console.warn('driver_end_trip notice:', res.error)
      }

      // 3. Play completion chime
      playTripEndCue()

      // 4. Release Wake Lock
      await wakeLock.releaseLock()

      // 5. Navigate to completion summary
      router.push(`/driver/summary/${scheduleId}`)
    } catch (err) {
      console.error('Failed to end trip cleanly:', err)
      router.push(`/driver/summary/${scheduleId}`)
    }
  }, [location, supabase, scheduleId, wakeLock, router])

  // 2000ms Continuous Hold-To-Confirm Gesture Engine
  const startHold = () => {
    if (endingTrip) return
    isHoldingRef.current = true
    holdStartTimeRef.current = Date.now()

    const checkProgress = () => {
      if (!isHoldingRef.current) return

      const elapsed = Date.now() - holdStartTimeRef.current
      const pct = Math.min(100, (elapsed / 2000) * 100)
      setHoldProgress(pct)

      if (pct >= 100) {
        isHoldingRef.current = false
        if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current)
        completeTrip()
        return
      }

      animFrameRef.current = requestAnimationFrame(checkProgress)
    }

    animFrameRef.current = requestAnimationFrame(checkProgress)
  }

  const cancelHold = () => {
    isHoldingRef.current = false
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
    setHoldProgress(0)
  }

  return (
    <div className="min-h-screen bg-[#001712] text-white flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto w-full select-none">
      {/* HUD Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-[#004D40]">
        {/* Transmission radar pulse */}
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center">
            <div className={`w-3.5 h-3.5 rounded-full ${location.isOnline ? 'bg-[#00E676]' : 'bg-[#FFB300]'}`} />
            {location.isOnline && (
              <div className="absolute w-6 h-6 rounded-full bg-[#00E676]/30 animate-ping" />
            )}
          </div>
          <div>
            <div className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>{location.isOnline ? 'GPS লাইভ চলছে' : '⚠️ অফলাইন মোড'}</span>
              <span className="text-[10px] text-white/50">| {location.isOnline ? 'TRANSMITTING' : 'BUFFERING'}</span>
            </div>
            <div className="text-[10px] text-white/60 font-mono">
              {location.lastSyncedAt
                ? `Synced ${secondsSinceSync}s ago`
                : 'Connecting to satellite...'}
            </div>
          </div>
        </div>

        {/* Status controls */}
        <div className="flex items-center gap-2">
          {/* Audio toggle */}
          <button
            type="button"
            onClick={toggleAudio}
            className="p-2.5 rounded-xl bg-[#002B22] border border-[#004D40] text-white/80 active:scale-95"
            title={audioMuteState ? 'Unmute' : 'Mute'}
          >
            {audioMuteState ? (
              <VolumeX className="w-4 h-4 text-[#FFB300]" />
            ) : (
              <Volume2 className="w-4 h-4 text-[#00E676]" />
            )}
          </button>

          {/* Network indicator */}
          <div className="p-2.5 rounded-xl bg-[#002B22] border border-[#004D40]">
            {location.isOnline ? (
              <Wifi className="w-4 h-4 text-[#00E676]" />
            ) : (
              <WifiOff className="w-4 h-4 text-[#FFB300]" />
            )}
          </div>
        </div>
      </div>

      {/* Offline Alert Banner if cellular drops */}
      {!location.isOnline && (
        <div className="my-2 bg-[#FFB300]/15 border-2 border-[#FFB300] rounded-2xl p-3 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-[#FFB300] shrink-0" />
            <div>
              <div className="text-xs font-extrabold text-[#FFB300]">
                নেটওয়ার্ক নেই • ফোনে ডাটা জমা হচ্ছে
              </div>
              <div className="text-[10px] text-white/80">
                {location.bufferedCount} points saved in local ring-buffer
              </div>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-[#FFB300] text-black px-2 py-0.5 rounded-md">
            {location.bufferedCount}/50
          </span>
        </div>
      )}

      {/* Main HUD Metrics Container */}
      <div className="my-auto py-2 space-y-4">
        {/* Speedometer & Satellite Health Card */}
        <div className="bg-[#002B22] border-2 border-[#00E676]/40 rounded-3xl p-5 shadow-[0_12px_40px_rgba(0,0,0,0.6)] relative overflow-hidden">
          <div className="grid grid-cols-2 gap-4 items-center">
            {/* Speedometer */}
            <div className="border-r border-[#004D40]/80 pr-2">
              <div className="text-xs font-bold text-[#00E676] uppercase tracking-wider mb-1">
                বর্তমান গতি / SPEED
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-white">
                  {location.speed !== null ? location.speed : '০'}
                </span>
                <span className="text-sm font-bold text-[#00E676]">KM/H</span>
              </div>
              <div className="text-[11px] text-white/50 font-mono mt-1">
                Accuracy: ±{location.accuracy ? Math.round(location.accuracy) : 4}m
              </div>
            </div>

            {/* Next Destination / Heading */}
            <div className="pl-2">
              <div className="text-xs font-bold text-[#00E676] uppercase tracking-wider mb-1 flex items-center gap-1">
                <Compass className="w-3.5 h-3.5" /> অভিমুখ / HEADING
              </div>
              <div className="text-xl sm:text-2xl font-black text-white truncate">
                {schedule?.destName || 'Terminus'}
              </div>
              <div className="text-xs text-[#00affe] font-bold mt-1">
                {location.heading ? `${Math.round(location.heading)}° Compass` : 'Satellite Tracking'}
              </div>
              <div className="text-[11px] text-white/50 truncate mt-1">
                {schedule?.vehicleName} ({schedule?.vehicleReg})
              </div>
            </div>
          </div>
        </div>

        {/* Route Details Ribbon */}
        <div className="bg-[#002B22]/80 border border-[#004D40] rounded-2xl p-3.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#00E676]" />
            <div>
              <div className="text-white/50 text-[10px]">রুট / Active Route</div>
              <div className="font-bold text-white text-sm truncate max-w-[200px]">
                {schedule?.originName} ➔ {schedule?.destName}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-white/50 text-[10px]">ছাড়ার সময় / Departure</div>
            <div className="font-mono font-bold text-[#00E676]">
              {schedule?.departure_time
                ? new Date(schedule.departure_time).toLocaleTimeString('en-IN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true
                  })
                : 'Today'}
            </div>
          </div>
        </div>

        {/* Quick Driver Broadcast Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleBroadcastQuickNote('15-Minute Tea/Rest Break')}
            className="h-14 bg-[#002B22] hover:bg-[#00382d] border border-[#004D40] text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all"
          >
            <Coffee className="w-4 h-4 text-[#FFB300]" />
            <span>১৫ মিনিট বিরতি / 15m Break</span>
          </button>

          <button
            type="button"
            onClick={() => handleBroadcastQuickNote('Traffic Congestion / Heavy Delay')}
            className="h-14 bg-[#002B22] hover:bg-[#00382d] border border-[#004D40] text-white rounded-2xl flex items-center justify-center gap-2 text-xs font-bold active:scale-95 transition-all"
          >
            <AlertOctagon className="w-4 h-4 text-red-400" />
            <span>ট্রাফিক জ্যাম / Traffic Delay</span>
          </button>
        </div>

        {/* Quick note feedback badge */}
        {quickNoteStatus && (
          <div className="text-center text-xs text-[#00E676] bg-[#00E676]/10 border border-[#00E676]/30 py-1.5 rounded-xl font-bold flex items-center justify-center gap-1.5 animate-fade-in">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>যাত্রীদের জানানো হয়েছে / Broadcasted to Passengers</span>
          </div>
        )}
      </div>

      {/* Footer Area: Hold-to-End Button & Wake Lock Indicator */}
      <div className="space-y-3 pt-2">
        {/* Massive 80px 2000ms Hold-to-End Trip Button */}
        <div className="relative">
          <button
            type="button"
            disabled={endingTrip || loadingSchedule}
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            className="w-full h-[80px] bg-[#FF3B30] hover:bg-[#e03026] text-white font-extrabold text-xl sm:text-2xl rounded-3xl flex items-center justify-center gap-3 relative overflow-hidden shadow-[0_8px_30px_rgba(255,59,48,0.4)] active:scale-[0.98] transition-all cursor-pointer"
          >
            {/* Visual Circular/Linear Progress Fill Overlay */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-white/35 transition-all duration-75 pointer-events-none"
              style={{ width: `${holdProgress}%` }}
            />

            {endingTrip ? (
              <div className="flex items-center gap-2 relative z-10">
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
                <span>যাত্রা সমাপ্ত হচ্ছে...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center relative z-10 text-center leading-tight">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg">■ যাত্রা শেষ করুন / END TRIP</span>
                </div>
                <div className="text-[11px] font-normal text-white/90">
                  {holdProgress > 0 ? `ধরে রাখুন... ${Math.round(holdProgress)}%` : '২ সেকেন্ড চেপে ধরে রাখুন (Hold 2 Seconds)'}
                </div>
              </div>
            )}
          </button>
        </div>

        {/* Active Wake Lock Confirmation */}
        <div className="text-center flex items-center justify-center gap-1.5 text-xs text-white/50">
          <Lock className="w-3.5 h-3.5 text-[#00E676]" />
          <span>স্ক্রিন লক চালু আছে • আলো বন্ধ হবে না (Screen Wake Lock Active)</span>
        </div>
      </div>
    </div>
  )
}

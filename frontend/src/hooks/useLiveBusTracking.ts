'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'

export interface LiveLocationData {
  latitude: number
  longitude: number
  speed: number | null
  heading: number | null
  accuracy: number | null
  recorded_at: string
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function useLiveBusTracking(scheduleId: string) {
  const isValidUuid = Boolean(scheduleId && UUID_REGEX.test(scheduleId))
  const [currentLocation, setCurrentLocation] = useState<LiveLocationData | null>(null)
  const [historyCoordinates, setHistoryCoordinates] = useState<Array<[number, number]>>([])
  const [isLive, setIsLive] = useState<boolean>(false)
  const [secondsSinceLastPing, setSecondsSinceLastPing] = useState<number>(-1)
  const [tripStatus, setTripStatus] = useState<string>('scheduled')
  const [pauseReason, setPauseReason] = useState<string | null>(null)
  const [loading, setLoading] = useState<boolean>(isValidUuid)

  const supabase = createClient()
  const lastPingTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!isValidUuid) return
    let isMounted = true

    const fetchInitialData = async () => {
      try {
        // 1. Fetch current schedule status and pause reason
        const { data: scheduleData } = await supabase
          .from('schedules')
          .select('status, pause_reason')
          .eq('id', scheduleId)
          .single()

        if (scheduleData && isMounted) {
          setTripStatus(scheduleData.status)
          if (scheduleData.pause_reason !== undefined) {
            setPauseReason(scheduleData.pause_reason)
          }
        }

        // 2. Fetch the most recent trip locations trail (latest 50 coordinates in descending order, then reversed)
        const { data: recentLocations } = await supabase
          .from('trip_locations')
          .select('latitude, longitude, speed, heading, accuracy, recorded_at')
          .eq('schedule_id', scheduleId)
          .order('recorded_at', { ascending: false })
          .limit(50)

        if (recentLocations && recentLocations.length > 0 && isMounted) {
          const chronological = [...recentLocations].reverse()
          const trail: Array<[number, number]> = chronological.map(pt => [pt.latitude, pt.longitude])
          setHistoryCoordinates(trail)

          const latest = chronological[chronological.length - 1]
          setCurrentLocation(latest)
          lastPingTimeRef.current = new Date(latest.recorded_at).getTime()
          const diff = Math.max(0, Math.round((Date.now() - lastPingTimeRef.current) / 1000))
          setSecondsSinceLastPing(diff)
          setIsLive(diff <= 60)
        }
      } catch (err) {
        console.error('Failed to fetch initial tracking data:', err)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchInitialData()

    // 3. Realtime subscription to trip_locations and schedule updates
    const channelName = `live-bus-${scheduleId}-${Date.now()}`
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trip_locations',
          filter: `schedule_id=eq.${scheduleId}`
        },
        (payload) => {
          if (!isMounted) return
          const newLoc = payload.new as LiveLocationData
          setCurrentLocation(newLoc)
          setHistoryCoordinates(prev => [...prev, [newLoc.latitude, newLoc.longitude]])
          lastPingTimeRef.current = Date.now()
          setIsLive(true)
          setSecondsSinceLastPing(0)
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'schedules',
          filter: `id=eq.${scheduleId}`
        },
        (payload) => {
          if (!isMounted) return
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const updated = payload.new as any
          if (updated?.status) {
            setTripStatus(updated.status)
          }
          if ('pause_reason' in (updated || {})) {
            setPauseReason(updated.pause_reason || null)
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log(`Subscribed to live tracking channel for schedule ${scheduleId}`)
        }
      })

    // 4. Heartbeat ticker tracking seconds since last ping
    const intervalId = setInterval(() => {
      if (!isMounted) return
      if (lastPingTimeRef.current === 0) {
        setSecondsSinceLastPing(-1)
        setIsLive(false)
        return
      }
      const diffSecs = Math.max(0, Math.round((Date.now() - lastPingTimeRef.current) / 1000))
      setSecondsSinceLastPing(diffSecs)

      if (diffSecs > 45) {
        setIsLive(false)
      }
    }, 1000)

    return () => {
      isMounted = false
      clearInterval(intervalId)
      supabase.removeChannel(channel)
    }
  }, [scheduleId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    currentLocation,
    historyCoordinates,
    isLive,
    secondsSinceLastPing,
    tripStatus,
    pauseReason,
    loading
  }
}

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

export function useLiveBusTracking(scheduleId: string) {
  const [currentLocation, setCurrentLocation] = useState<LiveLocationData | null>(null)
  const [historyCoordinates, setHistoryCoordinates] = useState<Array<[number, number]>>([])
  const [isLive, setIsLive] = useState<boolean>(false)
  const [secondsSinceLastPing, setSecondsSinceLastPing] = useState<number>(0)
  const [tripStatus, setTripStatus] = useState<string>('scheduled')
  const [loading, setLoading] = useState<boolean>(true)

  const supabase = createClient()
  const lastPingTimeRef = useRef<number>(0)

  useEffect(() => {
    if (!scheduleId) return
    let isMounted = true
    if (lastPingTimeRef.current === 0) {
      lastPingTimeRef.current = Date.now()
    }

    const fetchInitialData = async () => {
      try {

        // 1. Fetch current schedule status
        const { data: scheduleData } = await supabase
          .from('schedules')
          .select('status')
          .eq('id', scheduleId)
          .single()

        if (scheduleData && isMounted) {
          setTripStatus(scheduleData.status)
        }

        // 2. Fetch recent trip locations trail (last 30 coordinates)
        const { data: recentLocations } = await supabase
          .from('trip_locations')
          .select('latitude, longitude, speed, heading, accuracy, recorded_at')
          .eq('schedule_id', scheduleId)
          .order('recorded_at', { ascending: true })
          .limit(50)

        if (recentLocations && recentLocations.length > 0 && isMounted) {
          const trail: Array<[number, number]> = recentLocations.map(pt => [pt.latitude, pt.longitude])
          setHistoryCoordinates(trail)

          const latest = recentLocations[recentLocations.length - 1]
          setCurrentLocation(latest)
          lastPingTimeRef.current = new Date(latest.recorded_at).getTime()
          const diff = Math.round((Date.now() - lastPingTimeRef.current) / 1000)
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
    const channel = supabase
      .channel(`live-bus-${scheduleId}`)
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
  }, [scheduleId, supabase])

  return {
    currentLocation,
    historyCoordinates,
    isLive,
    secondsSinceLastPing,
    tripStatus,
    loading
  }
}

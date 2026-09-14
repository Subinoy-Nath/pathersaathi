'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/utils/supabase/client'
import { offlineBuffer, BufferedLocation } from '@/utils/offlineGpsBuffer'
import { playGpsDisconnectCue, playGpsReconnectCue } from '@/utils/audio'

export interface DriverLocationState {
  isTracking: boolean
  latitude: number | null
  longitude: number | null
  speed: number | null         // in km/h
  heading: number | null       // in degrees (0-360)
  accuracy: number | null      // in meters
  lastSyncedAt: Date | null
  error: string | null
  isOnline: boolean
  bufferedCount: number
}

export interface UseDriverLocationOptions {
  scheduleId: string
  vehicleId: string
  driverId: string
  minDistanceMeters?: number   // default: 15m
  maxAccuracyThreshold?: number // default: 35m
}

// Calculate Haversine distance in meters between two lat/lng points
function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3 // Earth's radius in meters
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad
  const dLon = (lon2 - lon1) * rad
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

export function useDriverLocation({
  scheduleId,
  vehicleId,
  driverId,
  minDistanceMeters = 15,
  maxAccuracyThreshold = 35
}: UseDriverLocationOptions) {
  const [state, setState] = useState<DriverLocationState>({
    isTracking: false,
    latitude: null,
    longitude: null,
    speed: null,
    heading: null,
    accuracy: null,
    lastSyncedAt: null,
    error: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    bufferedCount: 0
  })

  const lastCoordsRef = useRef<{ lat: number; lng: number } | null>(null)
  const lastTransmitTimeRef = useRef<number>(0)
  const watchIdRef = useRef<number | null>(null)
  const wasOfflineRef = useRef<boolean>(false)
  const supabase = createClient()

  // Transmit location point to Supabase or buffer offline
  const transmitLocation = useCallback(async (payload: BufferedLocation) => {
    const isCurrentlyOnline = typeof navigator !== 'undefined' ? navigator.onLine : true

    if (!isCurrentlyOnline) {
      await offlineBuffer.push(payload)
      const count = await offlineBuffer.count()
      setState(prev => ({ ...prev, bufferedCount: count, isOnline: false }))
      return
    }

    try {
      const { error } = await supabase.from('trip_locations').insert(payload)

      if (error) {
        throw error
      }

      lastTransmitTimeRef.current = Date.now()
      setState(prev => ({
        ...prev,
        lastSyncedAt: new Date(),
        error: null,
        isOnline: true
      }))
    } catch (err) {
      console.warn('Network upload failed, buffering locally in IndexedDB:', err)
      await offlineBuffer.push(payload)
      const count = await offlineBuffer.count()
      setState(prev => ({ ...prev, bufferedCount: count, isOnline: false }))
    }
  }, [supabase])

  // Process raw position from HTML5 Geolocation API
  const handlePosition = useCallback((position: GeolocationPosition) => {
    const { latitude, longitude, speed, heading, accuracy } = position.coords
    const now = Date.now()

    // 1. Accuracy Filter: Reject low-precision cellular tower triangulations (> 35m)
    if (accuracy && accuracy > maxAccuracyThreshold) {
      // Update coordinates locally for visual display but skip upload
      setState(prev => ({
        ...prev,
        latitude,
        longitude,
        accuracy,
        error: `Low GPS accuracy (${Math.round(accuracy)}m). Waiting for satellite fix...`
      }))
      return
    }

    // Convert speed from m/s to km/h (fallback to 0 if null or negative)
    const speedKmh = speed && speed > 0 ? Math.round(speed * 3.6) : 0

    // Dynamic speed-adaptive throttle interval
    // > 30 km/h: 8000ms
    // 10 - 30 km/h: 12000ms
    // < 10 km/h: 20000ms
    let dynamicThrottleMs = 8000
    if (speedKmh < 10) {
      dynamicThrottleMs = 20000
    } else if (speedKmh <= 30) {
      dynamicThrottleMs = 12000
    }

    let shouldTransmit = false
    if (!lastCoordsRef.current) {
      shouldTransmit = true
    } else {
      const distanceMoved = calculateHaversineDistance(
        lastCoordsRef.current.lat,
        lastCoordsRef.current.lng,
        latitude,
        longitude
      )
      const timeElapsed = now - lastTransmitTimeRef.current

      // Transmit if vehicle moved >= 15m AND throttle interval passed
      if (distanceMoved >= minDistanceMeters && timeElapsed >= dynamicThrottleMs) {
        shouldTransmit = true
      } else if (timeElapsed >= 25000) {
        // Stationary heartbeat ping every 25 seconds
        shouldTransmit = true
      }
    }

    // Update HUD state immediately
    setState(prev => ({
      ...prev,
      latitude,
      longitude,
      speed: speedKmh,
      heading: heading !== null && !isNaN(heading) ? heading : prev.heading,
      accuracy,
      error: null
    }))

    if (shouldTransmit) {
      lastCoordsRef.current = { lat: latitude, lng: longitude }
      transmitLocation({
        schedule_id: scheduleId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        latitude,
        longitude,
        speed: speedKmh,
        heading: heading !== null && !isNaN(heading) ? heading : null,
        accuracy: accuracy !== null && !isNaN(accuracy) ? accuracy : null,
        recorded_at: new Date().toISOString()
      })
    }
  }, [maxAccuracyThreshold, minDistanceMeters, scheduleId, vehicleId, driverId, transmitLocation])

  const handleError = useCallback((error: GeolocationPositionError) => {
    let msg = 'GPS error occurred'
    switch (error.code) {
      case error.PERMISSION_DENIED:
        msg = 'Location permission denied. Please enable location access in browser.'
        break
      case error.POSITION_UNAVAILABLE:
        msg = 'GPS signal lost. Searching for satellite lock...'
        playGpsDisconnectCue()
        break
      case error.TIMEOUT:
        msg = 'GPS request timed out. Retrying satellite lock...'
        break
    }
    setState(prev => ({ ...prev, error: msg }))
  }, [])

  // Start watching GPS position
  const startTracking = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState(prev => ({ ...prev, error: 'Geolocation is not supported on this device' }))
      return
    }

    const options: PositionOptions = {
      enableHighAccuracy: true, // Force hardware GPS chip over cellular/WiFi
      maximumAge: 0,            // Do not return cached positions
      timeout: 12000            // 12 second timeout
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      handlePosition,
      handleError,
      options
    )

    setState(prev => ({ ...prev, isTracking: true, error: null }))
  }, [handlePosition, handleError])

  // Stop watching GPS position
  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
    setState(prev => ({ ...prev, isTracking: false }))
  }, [])

  // Manage online/offline network listeners and initial buffered count
  useEffect(() => {
    // Check initial buffer count
    offlineBuffer.count().then(count => {
      setState(prev => ({ ...prev, bufferedCount: count }))
    })

    const handleOnline = async () => {
      setState(prev => ({ ...prev, isOnline: true }))
      if (wasOfflineRef.current) {
        playGpsReconnectCue()
        wasOfflineRef.current = false
      }
      // Replay all buffered coordinates
      await offlineBuffer.replayAll(supabase)
      const count = await offlineBuffer.count()
      setState(prev => ({ ...prev, bufferedCount: count }))
    }

    const handleOffline = () => {
      wasOfflineRef.current = true
      playGpsDisconnectCue()
      setState(prev => ({ ...prev, isOnline: false }))
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
      stopTracking()
    }
  }, [supabase, stopTracking])

  return {
    ...state,
    startTracking,
    stopTracking
  }
}

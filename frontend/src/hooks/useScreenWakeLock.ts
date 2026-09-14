'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useScreenWakeLock() {
  const [isLocked, setIsLocked] = useState<boolean>(false)
  const [isSupported] = useState<boolean>(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator)
  const wakeLockRef = useRef<WakeLockSentinel | null>(null)
  const shouldLockRef = useRef<boolean>(false)

  const requestLock = useCallback(async (): Promise<boolean> => {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return false
    }

    try {
      shouldLockRef.current = true
      const sentinel = await navigator.wakeLock.request('screen')
      wakeLockRef.current = sentinel
      setIsLocked(true)

      sentinel.addEventListener('release', () => {
        setIsLocked(false)
        wakeLockRef.current = null
      })

      return true
    } catch (err) {
      console.warn('Screen Wake Lock request failed:', err)
      setIsLocked(false)
      return false
    }
  }, [])

  const releaseLock = useCallback(async (): Promise<void> => {
    shouldLockRef.current = false
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release()
      } catch (err) {
        console.warn('Failed to release wake lock:', err)
      } finally {
        wakeLockRef.current = null
        setIsLocked(false)
      }
    }
  }, [])

  // Auto re-acquire wake lock on visibility change (e.g. returning from phone call or app switch)
  useEffect(() => {
    if (typeof document === 'undefined') return

    const handleVisibilityChange = async () => {
      if (
        document.visibilityState === 'visible' &&
        shouldLockRef.current &&
        !wakeLockRef.current
      ) {
        await requestLock()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {})
      }
    }
  }, [requestLock])

  return { isLocked, isSupported, requestLock, releaseLock }
}

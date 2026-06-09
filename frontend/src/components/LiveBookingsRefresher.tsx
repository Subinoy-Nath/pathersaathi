'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function LiveBookingsRefresher() {
  const router = useRouter()

  useEffect(() => {
    const supabase = createClient()

    // Subscribe to changes on the bookings table
    const channel = supabase
      .channel('operator_live_bookings')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'bookings'
        },
        (payload) => {
          console.log('Live booking update received:', payload)
          // Refresh the current route to fetch new data
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [router])

  // This component doesn't render anything visible
  return null
}

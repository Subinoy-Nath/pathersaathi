'use client'

import { useEffect, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { toast } from 'sonner'

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
          if (payload.eventType === 'INSERT') {
            toast.success('New Booking Received', {
              description: 'Dashboard updated with new live booking.',
            })
          }
          // Refresh the current route to fetch new data
          startTransition(() => {
            router.refresh()
          })
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

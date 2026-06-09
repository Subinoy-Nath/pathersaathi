'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function cancelBooking(bookingId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  // Call the atomic PostgreSQL function
  const { error: rpcError } = await supabase.rpc('cancel_booking_atomic', {
    p_booking_id: bookingId,
    p_customer_id: user.id
  })

  if (rpcError) {
    return { error: rpcError.message || 'Failed to cancel booking' }
  }

  revalidatePath('/bookings')
  return { success: true }
}

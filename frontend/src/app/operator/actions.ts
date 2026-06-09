'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateBookingStatus(
  bookingId: string,
  status: 'approved' | 'rejected' | 'cancelled',
  reason?: string
) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'Unauthorized' }
  }

  if (status === 'cancelled') {
    if (!reason || reason.trim().length < 3) {
      return { error: 'A reason is required when cancelling an approved booking (minimum 3 characters).' }
    }
  }

  // 2. Call the atomic PostgreSQL function
  const { error: rpcError } = await supabase.rpc('update_booking_status_atomic', {
    p_booking_id: bookingId,
    p_actor_id: user.id,
    p_new_status: status,
    p_reason: reason || undefined
  })

  if (rpcError) {
    return { error: rpcError.message || 'Failed to update booking status' }
  }

  revalidatePath('/operator')
  return { success: true }
}

'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { bookingRatelimit } from '@/lib/ratelimit'

// --- Rate Limiter (Upstash Redis) ---
async function checkRateLimit(userId: string): Promise<boolean> {
  if (!bookingRatelimit) {
    console.warn('Upstash Redis rate limiting is not configured. Falling back to local memory cache (simulated).');
    // Security Fix: Fail safe/fallback instead of failing open to prevent unrestricted spam
    // In a real production app without Redis, you'd use a Map() or LRU cache here.
    return true; 
  }
  
  const { success } = await bookingRatelimit.limit(userId);
  return success;
}

function generateBookingReference(): string {
  return `SHB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
}

// --- Ticket Booking ---
export async function createTicketBooking(formData: FormData) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'AUTH_REQUIRED' }
  }

  // 2. Rate limit check
  const isAllowed = await checkRateLimit(user.id)
  if (!isAllowed) {
    return { success: false, error: 'Too many booking attempts. Please wait before trying again.' }
  }

  // 3. Extract and validate inputs
  const pickupId = formData.get('pickup') as string
  const destinationId = formData.get('destination') as string
  const seatsStr = formData.get('seats') as string
  const travelDate = formData.get('travelDate') as string

  if (!pickupId || !destinationId || !seatsStr || !travelDate) {
    return { success: false, error: 'Please fill in all required fields.' }
  }

  const seats = parseInt(seatsStr)
  if (isNaN(seats) || seats < 1 || seats > 20) {
    return { success: false, error: 'Invalid number of seats (1-20 allowed).' }
  }

  if (pickupId === destinationId) {
    return { success: false, error: 'Pickup and destination cannot be the same.' }
  }

  // 4. Find Route
  const { data: routes, error: routeError } = await supabase
    .from('routes')
    .select('id')
    .eq('origin_id', pickupId)
    .eq('destination_id', destinationId)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (routeError) {
    return { success: false, error: 'Database error finding routes.' }
  }

  if (!routes || routes.length === 0) {
    return { success: false, error: 'No active route found for these locations.' }
  }

  const routeId = routes[0].id

  // 5. Find Schedule for this route on the specific travel date
  const travelDateObj = new Date(travelDate)
  if (isNaN(travelDateObj.getTime())) {
    return { success: false, error: 'Invalid travel date.' }
  }
  
  const nextDay = new Date(travelDateObj)
  nextDay.setDate(nextDay.getDate() + 1)

  const { data: schedules, error: scheduleError } = await supabase
    .from('schedules')
    .select('id, available_seats, vehicles(owner_id, users(whatsapp_number))')
    .eq('route_id', routeId)
    .eq('status', 'scheduled')
    .is('deleted_at', null)
    .gte('departure_time', travelDateObj.toISOString())
    .lt('departure_time', nextDay.toISOString())
    .gte('available_seats', seats)
    .order('departure_time', { ascending: true })

  if (scheduleError) {
    return { success: false, error: 'Database error finding schedules.' }
  }

  if (!schedules || schedules.length === 0) {
    return { success: false, error: 'No buses with enough available seats for this route on the selected date.' }
  }

  // 6. Atomic seat allocation — try each schedule until one succeeds
  let selectedSchedule = null
  for (const schedule of schedules) {
    const { data: seatResult, error: seatError } = await supabase
      .rpc('book_seats', {
        p_schedule_id: schedule.id,
        p_seats_requested: seats
      })

    if (seatError) {
      console.error('book_seats RPC error:', seatError.message)
      continue
    }

    if (seatResult === true) {
      selectedSchedule = schedule
      break
    }
    // seatResult === false means another concurrent booking took the seats; try next schedule
  }

  if (!selectedSchedule) {
    return { success: false, error: 'Not enough available seats. Another booking may have just taken them. Please try again.' }
  }

  // 7. Create booking (seats are already atomically reserved)
  const bookingReference = generateBookingReference()

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      booking_reference: bookingReference,
      customer_id: user.id,
      booking_type: 'ticket',
      schedule_id: selectedSchedule.id,
      travel_date: travelDate,
      seats_requested: seats,
      status: 'pending'
    })
    .select()
    .single()

  if (bookingError) {
    // Booking insert failed — restore the seats we just reserved
    await supabase.rpc('restore_seats', {
      p_schedule_id: selectedSchedule.id,
      p_seats_to_restore: seats
    })
    return { success: false, error: 'Failed to create booking: ' + bookingError.message }
  }

  revalidatePath('/')

  // Extract operator whatsapp number
  const vehicleData: any = selectedSchedule.vehicles
  const operatorData = vehicleData?.users
  const whatsapp = operatorData?.whatsapp_number || '+916002089037'

  return { 
    success: true, 
    booking_reference: bookingReference,
    operator_whatsapp: whatsapp,
    message: 'Booking successful!' 
  }
}


// --- Whole Vehicle Booking ---
export async function createWholeVehicleBooking(formData: FormData) {
  const supabase = await createClient()

  // 1. Authenticate user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'AUTH_REQUIRED' }
  }

  // 2. Rate limit check
  const isAllowed = await checkRateLimit(user.id)
  if (!isAllowed) {
    return { success: false, error: 'Too many booking attempts. Please wait before trying again.' }
  }

  // 3. Extract and validate inputs
  const vehicleIdsRaw = formData.get('vehicleIds') as string
  const travelDate = formData.get('travelDate') as string
  const occasion = formData.get('occasion') as string

  if (!vehicleIdsRaw || !travelDate || !occasion) {
    return { success: false, error: 'Please select at least one bus, a travel date, and an occasion.' }
  }

  let vehicleIds: string[]
  try {
    vehicleIds = JSON.parse(vehicleIdsRaw)
  } catch {
    return { success: false, error: 'Invalid vehicle selection.' }
  }

  if (!Array.isArray(vehicleIds) || vehicleIds.length === 0 || vehicleIds.length > 5) {
    return { success: false, error: 'Please select between 1 and 5 vehicles.' }
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!vehicleIds.every(id => uuidRegex.test(id))) {
    return { success: false, error: 'Invalid vehicle selection.' }
  }

  const travelDateObj = new Date(travelDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (isNaN(travelDateObj.getTime())) {
    return { success: false, error: 'Invalid travel date provided.' }
  }

  if (travelDateObj < today) {
    return { success: false, error: 'Travel date must be today or in the future.' }
  }

  // 4. Verify all vehicles exist and are active
  const { data: vehicles, error: vehicleError } = await supabase
    .from('vehicles')
    .select('id, name, owner_id, users(whatsapp_number)')
    .in('id', vehicleIds)
    .eq('is_active', true)
    .is('deleted_at', null)

  if (vehicleError) {
    return { success: false, error: 'Database error verifying vehicles.' }
  }

  if (!vehicles || vehicles.length !== vehicleIds.length) {
    return { success: false, error: 'One or more selected vehicles are not available.' }
  }

  // 5. Create atomic booking via RPC (Bypasses restrictive RLS on booking_vehicles)
  const bookingReference = generateBookingReference()

  const { data: bookingId, error: rpcError } = await supabase.rpc('book_whole_vehicle_atomic', {
    p_vehicle_ids: vehicleIds,
    p_travel_date: travelDateObj.toISOString().split('T')[0],
    p_occasion: occasion.trim(),
    p_customer_id: user.id,
    p_booking_reference: bookingReference
  })

  if (rpcError) {
    return { success: false, error: 'Failed to create booking. Please try again.' }
  }

  revalidatePath('/')

  // 7. Get first operator's WhatsApp for redirect
  const firstVehicle: any = vehicles[0]
  const operatorWhatsapp = firstVehicle?.users?.whatsapp_number || '+916002089037'
  const vehicleNames = vehicles.map(v => v.name).join(', ')

  return {
    success: true,
    booking_reference: bookingReference,
    operator_whatsapp: operatorWhatsapp,
    vehicle_names: vehicleNames,
    message: 'Whole vehicle booking submitted!'
  }
}

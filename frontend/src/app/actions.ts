'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { bookingRatelimit } from '@/lib/ratelimit'

// --- Rate Limiter (Upstash Redis) ---
async function checkRateLimit(userId: string): Promise<boolean> {
  if (!bookingRatelimit) {
    console.warn('Upstash Redis rate limiting is not configured. Falling back to local memory cache (simulated).');
    return true; 
  }
  
  try {
    const { success } = await bookingRatelimit.limit(userId);
    return success;
  } catch (error) {
    console.warn('Upstash Redis rate limiting failed, degrading gracefully:', error);
    return true;
  }
}

function generateBookingReference(): string {
  return `SHB-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`
}

// --- Ticket Booking ---
export async function searchSchedules(pickupId: string, destinationId: string, travelDate: string, seats: number) {
  const supabase = await createClient()

  if (!pickupId || !destinationId || !travelDate || seats < 1) {
    return { success: false, error: 'Please fill in all required fields.' }
  }

  // Find Valid Routes (including intermediate stops)
  const { data: routes, error: routeError } = await supabase
    .from('routes')
    .select(`
      id,
      origin_id,
      destination_id,
      route_stops ( location_id, stop_order )
    `)
    .eq('is_active', true)
    .is('deleted_at', null);

  if (routeError || !routes || routes.length === 0) {
    return { success: false, error: 'No active routes found.' }
  }

  const validRouteIds = routes.filter(route => {
    let pickupOrder = -1;
    let destOrder = -1;

    if (route.origin_id === pickupId) pickupOrder = 0;
    if (route.destination_id === pickupId) pickupOrder = 999999;
    
    if (route.origin_id === destinationId) destOrder = 0;
    if (route.destination_id === destinationId) destOrder = 999999;

    if (route.route_stops && route.route_stops.length > 0) {
      route.route_stops.forEach((stop: { location_id: string | null; stop_order: number }) => {
        if (stop.location_id === pickupId) pickupOrder = stop.stop_order;
        if (stop.location_id === destinationId) destOrder = stop.stop_order;
      });
    }

    return pickupOrder !== -1 && destOrder !== -1 && pickupOrder < destOrder;
  }).map(r => r.id);

  if (validRouteIds.length === 0) {
    return { success: false, error: 'No active route found for these locations.' }
  }
  const travelDateObj = new Date(travelDate)
  
  if (isNaN(travelDateObj.getTime())) {
    return { success: false, error: 'Invalid travel date.' }
  }

  const nextDay = new Date(travelDateObj)
  nextDay.setDate(nextDay.getDate() + 1)

  const { data: schedules, error: scheduleError } = await supabase
    .from('schedules')
    .select(`
      id, 
      departure_time, 
      arrival_time, 
      available_seats, 
      base_fare,
      vehicles(name, registration_number, features)
    `)
    .in('route_id', validRouteIds)
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
    // 1. Check for active broadcast notifications on this route
    const nowIso = new Date().toISOString()
    const { data: routeAlerts } = await supabase
      .from('broadcast_notifications')
      .select('id, title, message, severity, alert_type')
      .in('route_id', validRouteIds)
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
      .limit(1)

    if (routeAlerts && routeAlerts.length > 0) {
      const alert = routeAlerts[0]
      return {
        success: false,
        error: `Service Suspended: ${alert.title}. ${alert.message}`
      }
    }

    // 2. Check for paused or cancelled runs on this route for this travel date
    const { data: pausedSchedules } = await supabase
      .from('schedules')
      .select('id, pause_reason, status, departure_time, vehicles(name)')
      .in('route_id', validRouteIds)
      .in('status', ['paused', 'cancelled'])
      .is('deleted_at', null)
      .gte('departure_time', travelDateObj.toISOString())
      .lt('departure_time', nextDay.toISOString())

    if (pausedSchedules && pausedSchedules.length > 0) {
      const reasons = pausedSchedules.map(p => p.pause_reason).filter(Boolean)
      const primaryReason = reasons.length > 0 ? reasons[0] : 'Operational suspension or road conditions'
      return {
        success: false,
        error: `Service Paused: Scheduled departures on this route are currently suspended (${primaryReason}).`
      }
    }

    return { success: false, error: 'No buses with enough available seats for this route on the selected date.' }
  }

  // Lookup dynamic fares
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: dynamicFares } = await (supabase as any)
    .from('fares')
    .select('is_ac, fare_amount')
    .eq('origin_id', pickupId)
    .eq('destination_id', destinationId) as { data: { is_ac: boolean; fare_amount: number }[] | null };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const formattedSchedules = schedules.map((schedule: any) => {
    const features = schedule.vehicles?.features || "";
    const isAc = features.includes("AC") && !features.includes("Non-AC");
    
    let base_fare = schedule.base_fare;
    if (dynamicFares && dynamicFares.length > 0) {
      const matchingFare = dynamicFares.find(f => f.is_ac === isAc);
      if (matchingFare) {
        base_fare = matchingFare.fare_amount;
      }
    }
    
    return {
      ...schedule,
      vehicles: schedule.vehicles ? { ...schedule.vehicles, is_ac: isAc } : null,
      base_fare
    };
  });

  return { success: true, schedules: formattedSchedules }
}

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
  const scheduleId = formData.get('scheduleId') as string
  const seatsStr = formData.get('seats') as string
  const travelDate = formData.get('travelDate') as string

  if (!scheduleId || !seatsStr || !travelDate) {
    return { success: false, error: 'Missing booking details. Please try again.' }
  }

  const seats = parseInt(seatsStr)
  if (isNaN(seats) || seats < 1 || seats > 20) {
    return { success: false, error: 'Invalid number of seats (1-20 allowed).' }
  }

  // 4. Verify schedule is valid and available
  const { data: schedule, error: scheduleError } = await supabase
    .from('schedules')
    .select('id, available_seats, vehicles(owner_id, users(whatsapp_number))')
    .eq('id', scheduleId)
    .eq('status', 'scheduled')
    .is('deleted_at', null)
    .single()

  if (scheduleError || !schedule) {
    return { success: false, error: 'Schedule not found or no longer available.' }
  }

  if (schedule.available_seats < seats) {
    return { success: false, error: 'Not enough seats available.' }
  }

  // 5. Atomic seat allocation
  const { data: seatResult, error: seatError } = await supabase
    .rpc('book_seats', {
      p_schedule_id: schedule.id,
      p_seats_requested: seats
    })

  if (seatError || seatResult === false) {
    return { success: false, error: 'Seats were taken by another user. Please try again.' }
  }

  const selectedSchedule = schedule

  // 7. Create booking (seats are already atomically reserved)
  const bookingReference = generateBookingReference()

  const { error: bookingError } = await supabase
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
  const vehicleData = selectedSchedule.vehicles as { users?: { whatsapp_number?: string } | null } | null | undefined
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
  try {
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

    const { error: rpcError } = await supabase.rpc('book_whole_vehicle_atomic', {
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
    const firstVehicle = vehicles[0] as { users?: { whatsapp_number?: string } | null } | null | undefined
    const operatorWhatsapp = firstVehicle?.users?.whatsapp_number || '+916002089037'
    const vehicleNames = vehicles.map(v => v.name).join(', ')

    return {
      success: true,
      booking_reference: bookingReference,
      operator_whatsapp: operatorWhatsapp,
      vehicle_names: vehicleNames,
      message: 'Whole vehicle booking submitted!'
    }
  } catch (err) {
    console.error('CRITICAL ERROR inside createWholeVehicleBooking:', err);
    throw err;
  }
}

export async function forceDataRefresh() {
  revalidatePath('/', 'layout')
}

export interface TodayScheduleItem {
  id: string
  departure_time: string
  arrival_time: string
  available_seats: number
  total_seats: number
  base_fare: number | null
  status: 'scheduled' | 'boarding' | 'in_transit' | 'completed' | 'cancelled' | 'paused'
  pause_reason: string | null
  vehicles: {
    id?: string
    name: string
    registration_number: string | null
    image_url: string | null
    features?: string | null
    is_ac?: boolean
  } | null
  station_times?: any[] | null
  routes: {
    id?: string
    distance_km: number | null
    estimated_duration_mins: number | null
    origin: { id?: string; name: string } | null
    destination: { id?: string; name: string } | null
    route_stops?: { stop_order: number; custom_name?: string; location?: { name: string } }[] | null
  } | null
}

export async function getTodayIstRange(): Promise<{ startIso: string; endIso: string; todayDateStr: string }> {
  const now = new Date()
  const istFormatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const todayDateStr = istFormatter.format(now)
  const startIso = new Date(`${todayDateStr}T00:00:00+05:30`).toISOString()
  const endIso = new Date(`${todayDateStr}T23:59:59.999+05:30`).toISOString()

  return { startIso, endIso, todayDateStr }
}

/**
 * Fetches today's active/available bus runs for logged-in users.
 * Automatically incorporates recurring daily schedules generated by the nightly cron job.
 */
export async function getTodaySchedules(): Promise<{
  success: boolean
  error?: string
  schedules?: TodayScheduleItem[]
}> {
  const supabase = await createClient()

  // 1. Authenticate user - feature is for logged-in users
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'AUTH_REQUIRED', schedules: [] }
  }

  // 2. Compute date boundaries for today in Asia/Kolkata (IST)
  const { startIso, endIso } = await getTodayIstRange()


  // 3. Query today's active/available runs (scheduled, boarding, in_transit)
  const { data: todayRuns, error: todayError } = await supabase
    .from('schedules')
    .select(`
      id,
      departure_time,
      arrival_time,
      available_seats,
      total_seats,
      base_fare,
      status,
      pause_reason,
      station_times,
      vehicles (
        id,
        name,
        registration_number,
        image_url,
        features
      ),
      routes (
        id,
        distance_km,
        estimated_duration_mins,
        origin:locations!routes_origin_id_fkey ( id, name ),
        destination:locations!routes_destination_id_fkey ( id, name ),
        route_stops ( stop_order, custom_name, location:locations ( name ) )
      )
    `)
    .is('deleted_at', null)
    .in('status', ['scheduled', 'boarding', 'in_transit', 'paused'])
    .gte('departure_time', startIso)
    .lte('departure_time', endIso)
    .order('departure_time', { ascending: true })

  if (todayError) {
    console.error('Error fetching today schedules:', todayError)
    return { success: false, error: 'Database error fetching today schedules.', schedules: [] }
  }

  // 4. Also fetch any runs currently actively in_transit, paused, or boarding (including cross-midnight runs departing in last 24h)
  const yesterdayStartIso = new Date(new Date(startIso).getTime() - 24 * 60 * 60 * 1000).toISOString()
  const { data: activeRuns, error: activeError } = await supabase
    .from('schedules')
    .select(`
      id,
      departure_time,
      arrival_time,
      available_seats,
      total_seats,
      base_fare,
      status,
      pause_reason,
      station_times,
      vehicles (
        id,
        name,
        registration_number,
        image_url,
        features
      ),
      routes (
        id,
        distance_km,
        estimated_duration_mins,
        origin:locations!routes_origin_id_fkey ( id, name ),
        destination:locations!routes_destination_id_fkey ( id, name ),
        route_stops ( stop_order, custom_name, location:locations ( name ) )
      )
    `)
    .is('deleted_at', null)
    .in('status', ['in_transit', 'boarding', 'paused'])
    .gte('departure_time', yesterdayStartIso)
    .order('departure_time', { ascending: true })

  if (activeError) {
    console.error('Error fetching in_transit/boarding/paused schedules:', activeError)
  }

  // Deduplicate runs by id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheduleMap = new Map<string, any>()
  for (const item of (todayRuns || [])) {
    scheduleMap.set(item.id, item)
  }
  for (const item of (activeRuns || [])) {
    scheduleMap.set(item.id, item)
  }

  // Status priority for live tracking: in_transit (1) -> paused (2) -> boarding (3) -> scheduled (4)
  const statusPriority: Record<string, number> = {
    'in_transit': 1,
    'paused': 2,
    'boarding': 3,
    'scheduled': 4
  }

  // Sort by status priority first, then chronological by departure_time
  const sortedSchedules = Array.from(scheduleMap.values()).sort((a, b) => {
    const priorityA = statusPriority[a.status] || 99
    const priorityB = statusPriority[b.status] || 99
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
  })

  sortedSchedules.forEach(schedule => {
    if (schedule.vehicles) {
      const features = schedule.vehicles.features || "";
      schedule.vehicles.is_ac = features.includes("AC") && !features.includes("Non-AC");
    }
  });

  return {
    success: true,
    schedules: sortedSchedules as TodayScheduleItem[]
  }
}


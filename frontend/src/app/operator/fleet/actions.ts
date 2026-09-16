'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Validation constants
const IMAGE_URL_REGEX = /^\/images\/[a-zA-Z0-9_\-]+\.(jpg|jpeg|png|webp)$/

/**
 * Upsert a vehicle. If vehicleId is provided, updates existing; otherwise creates new.
 * owner_id is ALWAYS set server-side from auth.uid().
 */
export async function upsertVehicle(formData: FormData) {
  const supabase = await createClient()

  // 1. Identity from server
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  // 2. Verify role = operator
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'operator') {
    return { success: false, error: 'Only operators can manage vehicles.' }
  }

  // 3. Extract and validate ONLY whitelisted fields
  const vehicleId = formData.get('vehicle_id') as string | null
  const name = (formData.get('name') as string)?.trim()
  const vehicle_type = (formData.get('vehicle_type') as string)?.trim() || 'bus'
  const capacity_seats_str = formData.get('capacity_seats') as string
  const features = (formData.get('features') as string)?.trim() || null
  const registration_number = (formData.get('registration_number') as string)?.trim() || null
  const image_url = (formData.get('image_url') as string)?.trim() || null
  const is_active = formData.get('is_active') === 'true'

  // Validate required fields
  if (!name || name.length < 2 || name.length > 100) {
    return { success: false, error: 'Vehicle name must be between 2 and 100 characters.' }
  }

  if (vehicle_type !== 'bus') {
    return { success: false, error: 'Only bus vehicle type is supported.' }
  }

  const capacity_seats = parseInt(capacity_seats_str)
  if (isNaN(capacity_seats) || capacity_seats < 1 || capacity_seats > 100) {
    return { success: false, error: 'Capacity must be between 1 and 100 seats.' }
  }

  // Validate image_url: only relative /images/ paths allowed for MVP
  if (image_url && !IMAGE_URL_REGEX.test(image_url)) {
    return { success: false, error: 'Image URL must be a relative path like /images/bus1.jpg' }
  }

  // 4. Build whitelisted payload — owner_id is ALWAYS from auth
  const payload = {
    owner_id: user.id,
    name,
    vehicle_type,
    capacity_seats,
    features,
    registration_number,
    image_url,
    is_active,
  }

  if (vehicleId) {
    // UPDATE — verify ownership first
    const { data: existing } = await supabase
      .from('vehicles')
      .select('owner_id')
      .eq('id', vehicleId)
      .single()

    if (existing?.owner_id !== user.id) {
      return { success: false, error: 'You can only update your own vehicles.' }
    }

    const { error: updateError } = await supabase
      .from('vehicles')
      .update(payload)
      .eq('id', vehicleId)

    if (updateError) {
      return { success: false, error: 'Failed to update vehicle: ' + updateError.message }
    }
  } else {
    // INSERT
    const { error: insertError } = await supabase
      .from('vehicles')
      .insert(payload)

    if (insertError) {
      return { success: false, error: 'Failed to add vehicle: ' + insertError.message }
    }
  }

  revalidatePath('/operator/fleet')
  revalidatePath('/operator')
  return { success: true }
}

/**
 * Upsert a route. owner_id is ALWAYS set server-side from auth.uid().
 */
export async function upsertRoute(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role, verification_status')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'operator' || profile?.verification_status !== 'verified') {
    return { success: false, error: 'Only verified operators can manage routes.' }
  }

  const routeId = formData.get('route_id') as string | null
  const origin_id = formData.get('origin_id') as string
  const destination_id = formData.get('destination_id') as string
  const distance_km_str = formData.get('distance_km') as string
  const estimated_duration_mins_str = formData.get('estimated_duration_mins') as string

  if (!origin_id || !destination_id) {
    return { success: false, error: 'Origin and destination are required.' }
  }

  if (origin_id === destination_id) {
    return { success: false, error: 'Origin and destination must be different.' }
  }

  const distance_km = distance_km_str ? parseFloat(distance_km_str) : null
  const estimated_duration_mins = estimated_duration_mins_str ? parseInt(estimated_duration_mins_str) : null

  const parsedDistanceKm = distance_km !== null && !isNaN(distance_km) ? distance_km : null
  const parsedDurationMins = estimated_duration_mins !== null && !isNaN(estimated_duration_mins) ? estimated_duration_mins : null

  if (routeId) {
    // UPDATE — verify ownership
    const { data: existing } = await supabase
      .from('routes')
      .select('owner_id')
      .eq('id', routeId)
      .single()

    if (existing?.owner_id !== user.id) {
      return { success: false, error: 'You can only update routes you own.' }
    }

    const { error: updateError } = await supabase
      .from('routes')
      .update({
        owner_id: user.id,
        origin_id,
        destination_id,
        is_active: true,
        distance_km: parsedDistanceKm,
        estimated_duration_mins: parsedDurationMins,
      })
      .eq('id', routeId)

    if (updateError) {
      return { success: false, error: 'Failed to update route: ' + updateError.message }
    }
  } else {
    const { error: insertError } = await supabase
      .from('routes')
      .insert({
        owner_id: user.id,
        origin_id,
        destination_id,
        is_active: true,
        distance_km: parsedDistanceKm,
        estimated_duration_mins: parsedDurationMins,
      })

    if (insertError) {
      return { success: false, error: 'Failed to create route: ' + insertError.message }
    }
  }

  revalidatePath('/operator/fleet')
  return { success: true }
}

/**
 * Upsert a single or repeating schedule manually. Validates vehicle ownership before insert.
 */
export async function upsertSchedule(formData: FormData) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'operator') {
    return { success: false, error: 'Only operators can manage schedules.' }
  }

  const vehicle_id = formData.get('vehicle_id') as string
  const route_id = formData.get('route_id') as string
  const departure_time = formData.get('departure_time') as string
  const arrival_time = formData.get('arrival_time') as string
  const total_seats_str = formData.get('total_seats') as string
  const base_fare_str = formData.get('base_fare') as string

  if (!vehicle_id || !route_id || !departure_time || !arrival_time || !total_seats_str) {
    return { success: false, error: 'All required fields must be filled.' }
  }

  // Verify vehicle ownership
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('owner_id, capacity_seats')
    .eq('id', vehicle_id)
    .single()

  if (vehicle?.owner_id !== user.id) {
    return { success: false, error: 'You can only create schedules for your own vehicles.' }
  }

  const total_seats = parseInt(total_seats_str)
  if (isNaN(total_seats) || total_seats < 1 || total_seats > vehicle.capacity_seats) {
    return { success: false, error: `Total seats must be between 1 and ${vehicle.capacity_seats}.` }
  }

  const departureDate = new Date(departure_time)
  const arrivalDate = new Date(arrival_time)

  if (isNaN(departureDate.getTime()) || isNaN(arrivalDate.getTime())) {
    return { success: false, error: 'Invalid departure or arrival time.' }
  }

  if (departureDate >= arrivalDate) {
    return { success: false, error: 'Departure must be before arrival.' }
  }

  const base_fare = base_fare_str ? parseFloat(base_fare_str) : null
  const repeat_days_str = formData.get('repeat_days') as string
  const repeat_days = repeat_days_str ? parseInt(repeat_days_str) : 1

  if (isNaN(repeat_days) || repeat_days < 1 || repeat_days > 30) {
    return { success: false, error: 'Repeat days must be between 1 and 30.' }
  }

  const schedulesToInsert = []
  
  for (let i = 0; i < repeat_days; i++) {
    const iterDeparture = new Date(departureDate.getTime() + i * 24 * 60 * 60 * 1000)
    const iterArrival = new Date(arrivalDate.getTime() + i * 24 * 60 * 60 * 1000)
    
    schedulesToInsert.push({
      vehicle_id,
      route_id,
      departure_time: iterDeparture.toISOString(),
      arrival_time: iterArrival.toISOString(),
      total_seats,
      available_seats: total_seats,
      base_fare,
      status: 'scheduled',
    })
  }

  const { error: rpcError } = await supabase
    .rpc('upsert_schedules', { p_schedules: schedulesToInsert })

  if (rpcError) {
    return { success: false, error: 'Failed to create schedule(s): ' + rpcError.message }
  }

  revalidatePath('/operator/fleet')
  revalidatePath('/operator')
  return { success: true }
}

/**
 * Creates a recurring schedule template and immediately invokes rolling generation (14 days ahead).
 */
export async function createRecurringScheduleTemplate(formData: FormData) {
  const supabase = await createClient()

  // 1. Identity & role check
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'operator') {
    return { success: false, error: 'Only operators can manage recurring schedule templates.' }
  }

  // 2. Extract inputs
  const vehicle_id = (formData.get('vehicle_id') as string)?.trim()
  const route_id = (formData.get('route_id') as string)?.trim()
  let departure_time = (formData.get('departure_time') as string)?.trim()
  const estimated_duration_mins_str = formData.get('estimated_duration_mins') as string
  const base_fare_str = formData.get('base_fare') as string
  const total_seats_str = formData.get('total_seats') as string
  const default_driver_id = (formData.get('default_driver_id') as string)?.trim() || null

  // Extract days of week (array of integers 0-6)
  let days_of_week: number[] = []
  const rawDays = formData.getAll('days_of_week')
  if (rawDays.length > 0) {
    days_of_week = rawDays
      .map(d => parseInt(String(d)))
      .filter(d => !isNaN(d) && d >= 0 && d <= 6)
  } else {
    const daysJson = formData.get('days_of_week') as string
    if (daysJson) {
      try {
        const parsed = JSON.parse(daysJson)
        if (Array.isArray(parsed)) {
          days_of_week = parsed.map(Number).filter(d => !isNaN(d) && d >= 0 && d <= 6)
        }
      } catch {
        days_of_week = daysJson
          .split(',')
          .map(s => parseInt(s.trim()))
          .filter(d => !isNaN(d) && d >= 0 && d <= 6)
      }
    }
  }

  // Fallback if none selected: default to all days
  if (days_of_week.length === 0) {
    return { success: false, error: 'Please select at least one day of the week for the recurring schedule.' }
  }

  // Sort and remove duplicates
  days_of_week = Array.from(new Set(days_of_week)).sort((a, b) => a - b)

  // 3. Validation
  if (!vehicle_id || !route_id || !departure_time || !estimated_duration_mins_str || !base_fare_str || !total_seats_str) {
    return { success: false, error: 'All required fields must be provided.' }
  }

  // Normalize departure_time format (HH:MM or HH:MM:SS)
  if (/^\d{1,2}:\d{2}$/.test(departure_time)) {
    departure_time = `${departure_time}:00`
  }
  if (!/^\d{2}:\d{2}:\d{2}$/.test(departure_time)) {
    return { success: false, error: 'Departure time must be in HH:MM format.' }
  }

  const estimated_duration_mins = parseInt(estimated_duration_mins_str)
  if (isNaN(estimated_duration_mins) || estimated_duration_mins <= 0) {
    return { success: false, error: 'Estimated duration must be a positive number of minutes.' }
  }

  const base_fare = parseFloat(base_fare_str)
  if (isNaN(base_fare) || base_fare < 0) {
    return { success: false, error: 'Base fare must be greater than or equal to 0.' }
  }

  // 4. Verify vehicle ownership
  const { data: vehicle, error: vehicleError } = await supabase
    .from('vehicles')
    .select('owner_id, capacity_seats')
    .eq('id', vehicle_id)
    .single()

  if (vehicleError || !vehicle || vehicle.owner_id !== user.id) {
    return { success: false, error: 'You can only configure templates for vehicles you own.' }
  }

  const total_seats = parseInt(total_seats_str)
  if (isNaN(total_seats) || total_seats < 1 || total_seats > vehicle.capacity_seats) {
    return { success: false, error: `Total seats must be between 1 and vehicle capacity (${vehicle.capacity_seats}).` }
  }

  // 5. Insert into recurring_schedule_templates
  const { data: template, error: insertError } = await supabase
    .from('recurring_schedule_templates')
    .insert({
      operator_id: user.id,
      vehicle_id,
      route_id,
      departure_time,
      estimated_duration_mins,
      days_of_week,
      base_fare,
      total_seats,
      default_driver_id,
      is_paused: false,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') {
      return { success: false, error: 'A recurring schedule template for this vehicle, route, and departure time already exists.' }
    }
    return { success: false, error: 'Failed to create template: ' + insertError.message }
  }

  // 6. Materialize rolling horizon departures (14 days ahead)
  const { error: rpcError } = await supabase.rpc('generate_rolling_schedules', { p_days_ahead: 14 })
  if (rpcError) {
    console.error('generate_rolling_schedules warning:', rpcError)
  }

  revalidatePath('/operator/fleet')
  revalidatePath('/operator')
  return { success: true, template }
}

/**
 * Toggles template pause/active status.
 */
export async function toggleTemplateStatus(templateId: string, isPaused?: boolean, pauseReason?: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('recurring_schedule_templates')
    .select('id, operator_id, is_paused')
    .eq('id', templateId)
    .single()

  if (fetchError || !existing || existing.operator_id !== user.id) {
    return { success: false, error: 'Template not found or unauthorized.' }
  }

  const nextPausedState = typeof isPaused === 'boolean' ? isPaused : !existing.is_paused

  const { error: updateError } = await supabase
    .from('recurring_schedule_templates')
    .update({
      is_paused: nextPausedState,
      pause_reason: nextPausedState ? (pauseReason || 'Suspended by operator') : null,
      paused_until: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', templateId)

  if (updateError) {
    return { success: false, error: 'Failed to update template: ' + updateError.message }
  }

  // If resuming, materialize schedules
  if (!nextPausedState) {
    await supabase.rpc('generate_rolling_schedules', { p_days_ahead: 14 })
  }

  revalidatePath('/operator/fleet')
  return { success: true, is_paused: nextPausedState }
}

/**
 * Soft deletes a recurring schedule template.
 */
export async function deleteRecurringScheduleTemplate(templateId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  // Verify ownership
  const { data: existing, error: fetchError } = await supabase
    .from('recurring_schedule_templates')
    .select('id, operator_id')
    .eq('id', templateId)
    .single()

  if (fetchError || !existing || existing.operator_id !== user.id) {
    return { success: false, error: 'Template not found or unauthorized.' }
  }

  const { error: updateError } = await supabase
    .from('recurring_schedule_templates')
    .update({
      deleted_at: new Date().toISOString()
    })
    .eq('id', templateId)

  if (updateError) {
    return { success: false, error: 'Failed to delete template: ' + updateError.message }
  }

  revalidatePath('/operator/fleet')
  return { success: true }
}

/**
 * Pauses a specific schedule departure run.
 * Sets status to 'paused', records pause_reason, cancelled_at, and cancelled_by.
 * Optionally creates an active public broadcast alert.
 */
export async function pauseScheduleRun(
  scheduleId: string,
  pauseReason: string,
  createBroadcast: boolean = false,
  customBroadcastMessage?: string
) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  // 1. Fetch schedule and verify vehicle ownership
  const { data: schedule, error: schedError } = await supabase
    .from('schedules')
    .select(`
      id,
      vehicle_id,
      route_id,
      departure_time,
      arrival_time,
      status,
      vehicles ( owner_id, name ),
      routes (
        origin:locations!routes_origin_id_fkey ( name ),
        destination:locations!routes_destination_id_fkey ( name )
      )
    `)
    .eq('id', scheduleId)
    .single()

  if (schedError || !schedule) {
    return { success: false, error: 'Schedule not found.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vehicleData = schedule.vehicles as any
  if (vehicleData?.owner_id !== user.id) {
    return { success: false, error: 'Unauthorized: You do not own this vehicle or schedule.' }
  }

  if (schedule.status === 'completed' || schedule.status === 'cancelled') {
    return { success: false, error: `Cannot pause a departure that is already ${schedule.status}.` }
  }

  const reason = pauseReason?.trim() || 'Service temporarily paused by operator'

  // 2. Update schedule status to paused
  const { error: updateError } = await supabase
    .from('schedules')
    .update({
      status: 'paused',
      pause_reason: reason,
      cancelled_at: new Date().toISOString(),
      cancelled_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)

  if (updateError) {
    return { success: false, error: 'Failed to pause schedule: ' + updateError.message }
  }

  // 3. Create broadcast notification if requested
  if (createBroadcast) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const routeData = schedule.routes as any
    const originName = routeData?.origin?.name || 'Origin'
    const destName = routeData?.destination?.name || 'Destination'
    const depDate = schedule.departure_time ? new Date(schedule.departure_time) : null
    const formattedTime = depDate ? depDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : ''

    const title = `Service Suspended: ${originName} → ${destName}${formattedTime ? ` (${formattedTime})` : ''}`
    const message = customBroadcastMessage?.trim() || reason

    const { error: broadcastError } = await supabase
      .from('broadcast_notifications')
      .insert({
        operator_id: user.id,
        route_id: schedule.route_id,
        vehicle_id: schedule.vehicle_id,
        schedule_id: scheduleId,
        alert_type: 'service_disruption',
        severity: 'warning',
        title,
        message,
        is_active: true,
        starts_at: new Date().toISOString(),
        expires_at: schedule.arrival_time || null
      })

    if (broadcastError) {
      console.error('Warning: Failed to create broadcast notification:', broadcastError)
    }
  }

  revalidatePath('/operator/fleet')
  revalidatePath('/')
  revalidatePath('/bookings')
  return { success: true }
}

/**
 * Resumes a previously paused schedule run.
 * Sets status to 'scheduled', clears pause_reason and cancellation fields.
 * Deactivates any associated broadcast notifications.
 */
export async function resumeScheduleRun(scheduleId: string) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  // 1. Fetch schedule and verify ownership
  const { data: schedule, error: schedError } = await supabase
    .from('schedules')
    .select(`
      id,
      status,
      vehicles ( owner_id )
    `)
    .eq('id', scheduleId)
    .single()

  if (schedError || !schedule) {
    return { success: false, error: 'Schedule not found.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vehicleData = schedule.vehicles as any
  if (vehicleData?.owner_id !== user.id) {
    return { success: false, error: 'Unauthorized: You do not own this vehicle or schedule.' }
  }

  // 2. Restore schedule status
  const { error: updateError } = await supabase
    .from('schedules')
    .update({
      status: 'scheduled',
      pause_reason: null,
      cancelled_at: null,
      cancelled_by: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', scheduleId)

  if (updateError) {
    return { success: false, error: 'Failed to resume schedule: ' + updateError.message }
  }

  // 3. Deactivate related broadcasts
  const { error: broadcastUpdateError } = await supabase
    .from('broadcast_notifications')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('schedule_id', scheduleId)
    .eq('operator_id', user.id)

  if (broadcastUpdateError) {
    console.error('Warning: Failed to deactivate broadcast notifications:', broadcastUpdateError)
  }

  revalidatePath('/operator/fleet')
  revalidatePath('/')
  revalidatePath('/bookings')
  return { success: true }
}

/**
 * Triggers rolling schedule generation for next 14 days manually.
 */
export async function triggerRollingSchedules() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'You must be logged in.' }
  }

  const { data, error } = await supabase.rpc('generate_rolling_schedules', { p_days_ahead: 14 })
  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/operator/fleet')
  return { success: true, result: data }
}

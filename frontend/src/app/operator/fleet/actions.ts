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
 * Upsert a schedule. Validates vehicle ownership before insert.
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

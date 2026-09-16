import { createClient } from '@/utils/supabase/server'
import HomeClient from './HomeClient'

export default async function Home() {
  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const [locationsResponse, vehiclesResponse, broadcastsResponse] = await Promise.all([
    supabase.from('locations').select('*').is('deleted_at', null).order('name'),
    supabase.from('vehicles').select('*').is('deleted_at', null).eq('is_active', true),
    supabase
      .from('broadcast_notifications')
      .select(`
        id,
        title,
        message,
        severity,
        alert_type,
        starts_at,
        expires_at,
        is_active,
        route_id,
        routes (
          origin:locations!routes_origin_id_fkey ( name ),
          destination:locations!routes_destination_id_fkey ( name )
        ),
        vehicles ( name )
      `)
      .eq('is_active', true)
      .lte('starts_at', nowIso)
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order('created_at', { ascending: false })
  ])

  if (locationsResponse.error) {
    console.error('Failed to fetch locations:', locationsResponse.error)
  }
  if (vehiclesResponse.error) {
    console.error('Failed to fetch vehicles:', vehiclesResponse.error)
  }
  if (broadcastsResponse.error) {
    console.error('Failed to fetch broadcasts:', broadcastsResponse.error)
  }

  const locations = locationsResponse.data || []
  const vehicles = vehiclesResponse.data || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const broadcasts = (broadcastsResponse.data || []) as any[]

  return (
    <HomeClient
      locations={locations}
      vehicles={vehicles}
      initialBroadcasts={broadcasts}
    />
  )
}

import { createClient } from '@/utils/supabase/server'
import HomeClient from './HomeClient'
import { getTodaySchedules, TodayScheduleItem } from './actions'

export default async function Home({
  searchParams
}: {
  searchParams?: Promise<{ tab?: string }>
}) {
  const resolvedParams = searchParams ? await searchParams : undefined
  const initialTab = resolvedParams?.tab === 'track' ? 'track' : 'book'
  const supabase = await createClient()
  const nowIso = new Date().toISOString()

  const [locationsResponse, vehiclesResponse, broadcastsResponse, { data: { user } }] = await Promise.all([
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
      .order('created_at', { ascending: false }),
    supabase.auth.getUser()
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

  let initialTodaySchedules: TodayScheduleItem[] = []
  if (user) {
    const todayRes = await getTodaySchedules()
    if (todayRes.success && todayRes.schedules) {
      initialTodaySchedules = todayRes.schedules
    }
  }

  return (
    <HomeClient
      locations={locations}
      vehicles={vehicles}
      initialBroadcasts={broadcasts}
      initialUser={user ? { id: user.id, email: user.email } : null}
      initialTodaySchedules={initialTodaySchedules}
      initialTab={initialTab}
    />
  )
}


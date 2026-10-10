import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import FleetClient from './FleetClient'

export const dynamic = 'force-dynamic'

export default async function FleetPage() {
  const supabase = await createClient()

  // 1. Verify identity and role server-side
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('name, role, verification_status')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'operator') {
    redirect('/')
  }

  // 2. Fetch operator's vehicles
  const { data: rawVehicles } = await supabase
    .from('vehicles')
    .select('*')
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  const vehicles = (rawVehicles || []).sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
  )

  // 3. Fetch operator's routes (owner_id = auth.uid())
  const { data: ownedRoutesRaw } = await supabase
    .from('routes')
    .select(`
      id,
      origin_id,
      destination_id,
      distance_km,
      estimated_duration_mins,
      is_active,
      owner_id,
      origin:locations!routes_origin_id_fkey ( name ),
      destination:locations!routes_destination_id_fkey ( name )
    `)
    .eq('owner_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 4. Also fetch global routes (owner_id IS NULL) for selection in schedules
  const { data: globalRoutesRaw } = await supabase
    .from('routes')
    .select(`
      id,
      origin_id,
      destination_id,
      distance_km,
      estimated_duration_mins,
      is_active,
      owner_id,
      origin:locations!routes_origin_id_fkey ( name ),
      destination:locations!routes_destination_id_fkey ( name )
    `)
    .is('owner_id', null)
    .is('deleted_at', null)
    .eq('is_active', true)

  // 4b. Fetch route stops separately — isolated so a missing migration never
  //     breaks the routes display. Silently falls back to empty if table missing.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let stopsMap: Record<string, any[]> = {}
  try {
    const allRouteIds = [
      ...(ownedRoutesRaw || []).map(r => r.id),
      ...(globalRoutesRaw || []).map(r => r.id),
    ]
    if (allRouteIds.length > 0) {
      const { data: stopsData } = await supabase
        .from('route_stops')
        .select('id, route_id, location_id, custom_name, stop_order, locations ( name )')
        .in('route_id', allRouteIds)
        .order('stop_order', { ascending: true })

      if (stopsData) {
        for (const stop of stopsData) {
          if (!stopsMap[stop.route_id]) stopsMap[stop.route_id] = []
          stopsMap[stop.route_id].push(stop)
        }
      }
    }
  } catch {
    // route_stops table may not exist yet (pending migration) — degrade gracefully
    stopsMap = {}
  }

  // Merge stops back onto routes
  const ownedRoutes = (ownedRoutesRaw || []).map(r => ({
    ...r,
    route_stops: stopsMap[r.id] || [],
  }))
  const globalRoutes = (globalRoutesRaw || []).map(r => ({
    ...r,
    route_stops: stopsMap[r.id] || [],
  }))

  // 5. Fetch all locations for dropdowns
  const { data: locations } = await supabase
    .from('locations')
    .select('id, name')
    .is('deleted_at', null)
    .order('name')

  // 6. Fetch recurring schedule templates for operator
  const { data: templatesData } = await supabase
    .from('recurring_schedule_templates')
    .select(`
      id,
      operator_id,
      vehicle_id,
      route_id,
      default_driver_id,
      departure_time,
      estimated_duration_mins,
      days_of_week,
      base_fare,
      total_seats,
      is_paused,
      pause_reason,
      paused_until,
      created_at,
      vehicles ( name, registration_number, capacity_seats ),
      routes (
        origin:locations!routes_origin_id_fkey ( name ),
        destination:locations!routes_destination_id_fkey ( name )
      )
    `)
    .eq('operator_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // 7. Fetch concrete schedules for operator's vehicles
  const vehicleIds = vehicles?.map(v => v.id) || []
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let schedules: any[] = []

  if (vehicleIds.length > 0) {
    const { data: schedulesData } = await supabase
      .from('schedules')
      .select(`
        id,
        departure_time,
        arrival_time,
        total_seats,
        available_seats,
        base_fare,
        status,
        pause_reason,
        cancelled_at,
        cancelled_by,
        template_id,
        vehicle_id,
        route_id,
        station_times,
        vehicles ( name, registration_number ),
        routes (
          origin:locations!routes_origin_id_fkey ( name ),
          destination:locations!routes_destination_id_fkey ( name )
        ),
        recurring_schedule_templates ( days_of_week )
      `)
      .in('vehicle_id', vehicleIds)
      .is('deleted_at', null)
      .order('departure_time', { ascending: false })
      .limit(100)

    if (schedulesData) {
      schedules = schedulesData
    }
  }

  const allRoutes = [...(ownedRoutes || []), ...(globalRoutes || [])]

  return (
    <div className="bg-[#f8fafb] text-[#191c1d] min-h-screen pt-20">
      <div className="flex min-h-[calc(100vh-80px)]">
        {/* Sidebar Navigation (Desktop) */}
        <aside className="hidden md:flex flex-col sticky top-20 h-[calc(100vh-80px)] overflow-y-auto w-80 bg-white p-4 space-y-4 border-r border-[#bfc9c4]/20 shadow-sm z-10">
          <div className="flex flex-col gap-1 p-4 bg-[#f2f4f5] rounded-xl mb-4">
            <span className="text-xl font-bold text-[#00342b] capitalize">{profile.role}</span>
            <span className="text-sm font-semibold text-[#3f4945]">Pather Saathi Partner</span>
          </div>
          <nav className="flex flex-col space-y-1">
            <Link href="/operator" className="flex items-center gap-3 px-4 py-3 text-[#3f4945] hover:bg-[#e6e8e9] rounded-lg hover:translate-x-1 duration-300">
              <span className="material-symbols-outlined">dashboard</span>
              <span className="text-sm">Dashboard</span>
            </Link>
            <Link href="/operator/fleet" className="flex items-center gap-3 px-4 py-3 bg-[#00affe] text-[#003f5f] rounded-lg font-bold transition-all ease-in-out">
              <span className="material-symbols-outlined">directions_bus</span>
              <span className="text-sm">Fleet Monitoring</span>
            </Link>
            <Link href="/operator" className="flex items-center gap-3 px-4 py-3 text-[#3f4945] hover:bg-[#e6e8e9] rounded-lg hover:translate-x-1 duration-300">
              <span className="material-symbols-outlined">receipt_long</span>
              <span className="text-sm">Bookings & Ledgers</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-5 md:p-8 space-y-8 pb-32 md:pb-12">
          {/* Mobile Profile Card */}
          <div className="md:hidden flex flex-col gap-1 p-5 bg-gradient-to-r from-[#00342b] to-[#004d40] rounded-xl shadow-lg text-white mb-2">
            <span className="text-xl font-bold capitalize">{profile?.role}</span>
            <span className="text-sm font-medium text-[#afefdd]">Pather Saathi Partner</span>
          </div>

          {/* Header Section */}
          <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-[#00342b]">Fleet Operations Cockpit</h1>
              <p className="text-base font-medium text-[#3f4945] mt-1">Manage vehicles, routes, recurring templates, and daily departure runs</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/operator" className="glass-card flex items-center gap-2 px-6 py-2.5 rounded-xl text-[#00342b] border border-[#00342b]/10 hover:bg-[#004d40]/5 transition-all">
                <span className="material-symbols-outlined text-[20px]">arrow_back</span>
                <span className="font-semibold text-sm">Dashboard</span>
              </Link>
            </div>
          </header>

          <FleetClient
            vehicles={vehicles || []}
            ownedRoutes={ownedRoutes || []}
            globalRoutes={globalRoutes || []}
            allRoutes={allRoutes}
            locations={locations || []}
            templates={templatesData || []}
            schedules={schedules}
            isVerified={profile?.verification_status === 'verified'}
          />
        </main>
      </div>
    </div>
  )
}

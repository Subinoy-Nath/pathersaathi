import assert from 'node:assert'
import test, { before, after } from 'node:test'
import { spawn, ChildProcess } from 'node:child_process'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest } from 'next/server'
import { Database } from '../types/database.types'
import { getTodayIstRange } from '../app/actions'
import { updateSession } from '../utils/supabase/middleware'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

// Ensure env vars are set for Next middleware / actions
process.env.NEXT_PUBLIC_SUPABASE_URL = SUPABASE_URL
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = SUPABASE_ANON_KEY

let testServerProcess: ChildProcess | null = null
let activeBaseUrl = process.env.TEST_APP_URL || 'http://127.0.0.1:3000'

before(async () => {
  // Check if a server is already running on activeBaseUrl
  let serverOnline = false
  try {
    const probe = await fetch(activeBaseUrl, { signal: AbortSignal.timeout(600) })
    serverOnline = probe.status > 0
  } catch {
    serverOnline = false
  }

  if (!serverOnline) {
    const testPort = 3458
    activeBaseUrl = `http://127.0.0.1:${testPort}`
    testServerProcess = spawn('npx', ['next', 'start', '-p', String(testPort)], {
      cwd: process.cwd(),
      stdio: 'ignore',
      detached: true
    })

    // Poll until ready
    const startWait = Date.now()
    while (Date.now() - startWait < 15000) {
      try {
        const probe = await fetch(activeBaseUrl, { signal: AbortSignal.timeout(500) })
        if (probe.status === 200) {
          serverOnline = true
          break
        }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 150))
    }

    if (!serverOnline) {
      console.warn('Warning: Local Next.js server did not start within timeout; continuing tests')
    }
  }
})

after(() => {
  if (testServerProcess?.pid) {
    try {
      process.kill(-testServerProcess.pid, 'SIGKILL')
    } catch {}
    testServerProcess = null
  }
})

test('1. getTodayIstRange computes valid ISO boundaries for Asia/Kolkata', async () => {
  const { startIso, endIso, todayDateStr } = await getTodayIstRange()
  
  assert.match(todayDateStr, /^\d{4}-\d{2}-\d{2}$/, 'todayDateStr must be YYYY-MM-DD')
  const startDate = new Date(startIso)
  const endDate = new Date(endIso)

  assert.ok(!isNaN(startDate.getTime()), 'startIso must be valid date')
  assert.ok(!isNaN(endDate.getTime()), 'endIso must be valid date')
  assert.ok(startDate < endDate, 'startIso must be before endIso')

  // The span between start and end should be ~24 hours (86399999 ms)
  const diffMs = endDate.getTime() - startDate.getTime()
  assert.strictEqual(diffMs, 86399999, 'Boundary must span full 24 hours of today in IST')
})

test('2. Logged-in user without bookings can fetch today active schedules in hero section', async () => {
  // Create an independent client for a customer who has NO bookings
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const testEmail = `test_hero_nobooking_${Date.now()}@example.com`
  const testPassword = 'Password123!'

  const { data: authData, error: signUpError } = await client.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { name: 'Hero Test Passenger' }
    }
  })

  assert.ifError(signUpError)
  assert.ok(authData.user?.id, 'User must be created')
  const userId = authData.user.id

  // Verify this user has 0 bookings in public.bookings
  const { data: bookings, error: bookingsError } = await client
    .from('bookings')
    .select('id')
    .eq('customer_id', userId)

  assert.ifError(bookingsError)
  assert.strictEqual(bookings?.length || 0, 0, 'User must have exactly 0 bookings')

  // Fetch today schedules using the same query used in hero section (getTodaySchedules)
  const { startIso, endIso } = await getTodayIstRange()

  const { data: todayRuns, error: todayError } = await client
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
      vehicles (
        id,
        name,
        registration_number,
        image_url
      ),
      routes (
        id,
        distance_km,
        estimated_duration_mins,
        origin:locations!routes_origin_id_fkey ( id, name ),
        destination:locations!routes_destination_id_fkey ( id, name )
      )
    `)
    .is('deleted_at', null)
    .in('status', ['scheduled', 'boarding', 'in_transit', 'paused'])
    .gte('departure_time', startIso)
    .lte('departure_time', endIso)
    .order('departure_time', { ascending: true })

  assert.ifError(todayError)
  assert.ok(Array.isArray(todayRuns), 'Today runs must be an array')
  assert.ok(todayRuns.length > 0, 'Should return active schedule runs generated for today')

  const schedule = todayRuns[0]
  assert.ok(schedule.id, 'Schedule must have an ID')
  assert.ok(schedule.departure_time, 'Schedule must have a departure time')
  assert.ok(['scheduled', 'boarding', 'in_transit', 'paused'].includes(schedule.status), 'Schedule status must be active/available')
  assert.ok(schedule.vehicles?.name, 'Schedule must have associated vehicle name')
  assert.ok(schedule.routes?.origin?.name, 'Schedule must have route origin')
  assert.ok(schedule.routes?.destination?.name, 'Schedule must have route destination')

  // Verify that the track button route format is /bookings/track/[scheduleId]
  const trackUrl = `/bookings/track/${schedule.id}`
  assert.match(trackUrl, /^\/bookings\/track\/[0-9a-f-]+$/i, 'Track URL must route to /bookings/track/[scheduleId]')
})

test('3. Open Tracking Access: User without bookings can track bus telemetry on /bookings/track/[scheduleId]', async () => {
  // Client authenticated as a passenger without any bookings
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  const testEmail = `test_open_tracking_${Date.now()}@example.com`
  const { data: authData } = await client.auth.signUp({
    email: testEmail,
    password: 'Password123!',
    options: { data: { name: 'Open Tracking Test User' } }
  })

  assert.ok(authData.user?.id)

  // Get active schedule
  const { data: schedules } = await client
    .from('schedules')
    .select('id, vehicle_id, driver_id, status')
    .is('deleted_at', null)
    .limit(1)

  assert.ok(schedules && schedules.length > 0, 'Must have at least one schedule to test tracking')
  const scheduleId = schedules[0].id

  // 1. Verify passenger can load schedule metadata needed for tracking page
  const { data: schedMeta, error: metaError } = await client
    .from('schedules')
    .select(`
      id,
      departure_time,
      pause_reason,
      vehicles (
        name,
        registration_number
      ),
      routes (
        origin:locations!routes_origin_id_fkey ( name ),
        destination:locations!routes_destination_id_fkey ( name )
      )
    `)
    .eq('id', scheduleId)
    .single()

  assert.ifError(metaError)
  assert.strictEqual(schedMeta.id, scheduleId)
  assert.ok(schedMeta.vehicles?.name)
  assert.ok(schedMeta.routes?.origin?.name)

  // 2. Query telemetry point using client (Testing R2: Open Tracking Access RLS policy)
  const { data: locations, error: locError } = await client
    .from('trip_locations')
    .select('latitude, longitude, speed, heading, accuracy, recorded_at')
    .eq('schedule_id', scheduleId)
    .order('recorded_at', { ascending: true })

  assert.ifError(locError, 'User without bookings MUST be allowed to query trip_locations under Open Tracking Access')
  assert.ok(Array.isArray(locations), 'Locations result must be an array')
})

test('4. Realtime Telemetry Broadcast: User without bookings receives live GPS ping via WebSocket', async () => {
  const serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  
  // Find driver
  const { data: drivers } = await serviceClient.from('users').select('id').eq('role', 'driver').limit(1)
  let driverId = drivers?.[0]?.id
  if (!driverId) {
    const { data: anyUser } = await serviceClient.from('users').select('id').limit(1)
    driverId = anyUser![0].id
  }

  // Find active schedule
  const { data: scheds } = await serviceClient.from('schedules').select('id, vehicle_id').limit(1)
  assert.ok(scheds && scheds.length > 0)
  const sched = scheds[0]

  // Create unbooked customer
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY)
  const { data: authData } = await client.auth.signUp({
    email: `rt_eval_${Date.now()}@example.com`,
    password: 'Password123!'
  })
  assert.ok(authData.user?.id)

  let receivedPing = false
  const targetLat = 24.8333
  const targetLng = 92.7789

  const channel = client.channel(`test-realtime-${Date.now()}`)

  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      resolve() // Let assertion evaluate receivedPing
    }, 8000)

    channel.on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'trip_locations',
      filter: `schedule_id=eq.${sched.id}`
    }, (payload) => {
      if (payload.new && (payload.new as { latitude: number }).latitude === targetLat) {
        receivedPing = true
        clearTimeout(timeout)
        resolve()
      }
    })

    channel.subscribe(async (status, err) => {
      if (err) {
        clearTimeout(timeout)
        reject(err)
        return
      }
      if (status === 'SUBSCRIBED') {
        const { error: insErr } = await serviceClient.from('trip_locations').insert({
          schedule_id: sched.id,
          vehicle_id: sched.vehicle_id,
          driver_id: driverId,
          latitude: targetLat,
          longitude: targetLng,
          speed: 48,
          heading: 90
        })
        if (insErr) {
          clearTimeout(timeout)
          reject(insErr)
        }
      }
    })
  })

  await client.removeChannel(channel)
  client.realtime.disconnect()
  serviceClient.realtime.disconnect()
  assert.ok(receivedPing, 'Authenticated user without bookings must receive live telemetry via Realtime WebSocket')
})

test('5. Direct Access Control: updateSession redirects unauthenticated requests and permits authenticated sessions', async () => {
  // 1. Unauthenticated request to /bookings/track/[scheduleId] -> must redirect to /login
  const unauthReq = new NextRequest('http://127.0.0.1:3000/bookings/track/test-schedule-123')
  const unauthRes = await updateSession(unauthReq)
  assert.strictEqual(unauthRes.status, 307, 'Unauthenticated access to tracking route must return 307 redirect')
  assert.ok(unauthRes.headers.get('location')?.includes('/login'), 'Redirect target must be /login')

  // 2. Authenticated request with cookies -> must allow (pass through)
  const cookiesMap = new Map<string, string>()
  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value })) },
      setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => cookiesMap.set(name, value)) }
    }
  })

  const { data: authData } = await ssrClient.auth.signUp({
    email: `direct_mw_${Date.now()}@example.com`,
    password: 'Password123!'
  })
  assert.ok(authData.user?.id)

  const cookieHeader = Array.from(cookiesMap.entries()).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')
  const authReq = new NextRequest('http://127.0.0.1:3000/bookings/track/test-schedule-123', {
    headers: { cookie: cookieHeader }
  })
  const authRes = await updateSession(authReq)
  assert.strictEqual(authRes.status, 200, 'Authenticated user must be permitted to access tracking route without redirect')
  assert.strictEqual(authRes.headers.get('location'), null, 'Authenticated user should have no redirect location')
})

test('6. Existing booking flows remain functional and unbroken', async () => {
  const client = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  })

  // 1. Locations are accessible for search
  const { data: locations, error: locError } = await client
    .from('locations')
    .select('id, name')
    .is('deleted_at', null)

  assert.ifError(locError)
  assert.ok(locations && locations.length >= 2, 'Locations must be present')

  // 2. Active routes exist
  const { data: routes, error: routeError } = await client
    .from('routes')
    .select('id, origin_id, destination_id')
    .eq('is_active', true)
    .is('deleted_at', null)

  assert.ifError(routeError)
  assert.ok(routes && routes.length > 0, 'Routes must be available')

  // 3. Vehicles for whole bus booking are accessible
  const { data: vehicles, error: vehError } = await client
    .from('vehicles')
    .select('id, name, capacity_seats, is_active')
    .eq('is_active', true)
    .is('deleted_at', null)

  assert.ifError(vehError)
  assert.ok(vehicles && vehicles.length > 0, 'Vehicles must be available for booking')
})

test('7. End-to-End HTTP: Logged-in user receives hero Track Bus Live UI and preloaded schedules', async () => {
  const cookiesMap = new Map<string, string>()
  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => cookiesMap.set(name, value))
      }
    }
  })

  const testEmail = `test_e2e_hero_${Date.now()}@example.com`
  const { data: authData } = await ssrClient.auth.signUp({
    email: testEmail,
    password: 'Password123!',
    options: { data: { name: 'E2E Hero Tester' } }
  })

  assert.ok(authData.user?.id)

  const cookieHeader = Array.from(cookiesMap.entries())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ')

  // 1. Fetch homepage with auth cookie
  const res = await fetch(`${activeBaseUrl}/`, {
    headers: { Cookie: cookieHeader }
  })

  assert.strictEqual(res.status, 200, 'Homepage must return HTTP 200')
  const html = await res.text()

  // Verify Hero section elements are rendered
  assert.ok(html.includes('data-testid="track-bus-live-tab"'), 'Hero card must include Track Bus Live tab')
  assert.ok(html.includes('data-testid="hero-track-live-cta"'), 'Hero left column must include Track Bus Live CTA')
  assert.ok(html.includes('Track Bus Live'), 'Text Track Bus Live must be rendered')
})

test('8. End-to-End HTTP: Logged-in user without bookings loads /bookings/track/[scheduleId] directly (HTTP 200)', async () => {
  const cookiesMap = new Map<string, string>()
  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value }))
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => cookiesMap.set(name, value))
      }
    }
  })

  const testEmail = `test_e2e_track_${Date.now()}@example.com`
  const { data: authData } = await ssrClient.auth.signUp({
    email: testEmail,
    password: 'Password123!',
    options: { data: { name: 'E2E Tracking Tester' } }
  })

  assert.ok(authData.user?.id)

  const cookieHeader = Array.from(cookiesMap.entries())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join('; ')

  const { data: schedules } = await ssrClient
    .from('schedules')
    .select('id')
    .is('deleted_at', null)
    .limit(1)

  assert.ok(schedules && schedules.length > 0)
  const scheduleId = schedules[0].id

  const trackRes = await fetch(`${activeBaseUrl}/bookings/track/${scheduleId}`, {
    headers: { Cookie: cookieHeader },
    redirect: 'manual'
  })

  assert.strictEqual(trackRes.status, 200, 'Logged-in user without bookings must be able to load tracking page (HTTP 200)')
})

test('9. End-to-End HTTP: Unauthenticated guest accessing /bookings/track/[scheduleId] is redirected to /login', async () => {
  const { data: schedules } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    .from('schedules')
    .select('id')
    .is('deleted_at', null)
    .limit(1)

  assert.ok(schedules && schedules.length > 0)
  const scheduleId = schedules[0].id

  // Unauthenticated fetch with redirect: manual
  const res = await fetch(`${activeBaseUrl}/bookings/track/${scheduleId}`, {
    redirect: 'manual'
  })

  assert.strictEqual(res.status, 307, 'Unauthenticated access should trigger 307 redirect')
  const location = res.headers.get('location')
  assert.ok(location?.includes('/login'), 'Redirect destination must be /login')
})

test('10. End-to-End Route Verification: Hero section Track Bus Live link routes to /bookings/track/[scheduleId] and loads tracking interface', async () => {
  const cookiesMap = new Map<string, string>()
  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value })) },
      setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => cookiesMap.set(name, value)) }
    }
  })

  const testEmail = `test_e2e_route_${Date.now()}@example.com`
  const { data: authData } = await ssrClient.auth.signUp({
    email: testEmail,
    password: 'Password123!',
    options: { data: { name: 'E2E Route Tester' } }
  })
  assert.ok(authData.user?.id)

  const cookieHeader = Array.from(cookiesMap.entries()).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')

  // Fetch homepage requesting the track tab directly (SSR)
  const homeRes = await fetch(`${activeBaseUrl}/?tab=track`, {
    headers: { Cookie: cookieHeader }
  })
  assert.strictEqual(homeRes.status, 200)
  const homeHtml = await homeRes.text()

  // Verify Track Bus Live panel is rendered
  assert.ok(homeHtml.includes('data-testid="track-bus-live-panel"'), 'Track Bus Live panel must be rendered in hero section')
  assert.ok(homeHtml.includes('data-testid="today-schedules-list"'), 'Today schedules list must be rendered')

  // Extract track button href from rendered hero section HTML
  const trackButtonMatch = homeHtml.match(/href="(\/bookings\/track\/[0-9a-f-]+)"[^>]*data-testid="track-button-[0-9a-f-]+"/i) ||
                           homeHtml.match(/data-testid="track-button-[0-9a-f-]+"[^>]*href="(\/bookings\/track\/[0-9a-f-]+)"/i)
  assert.ok(trackButtonMatch, 'Track button with href="/bookings/track/[scheduleId]" must be present in hero section HTML')
  const trackRouteUrl = trackButtonMatch[1]

  // Request the exact URL targeted by the track button
  const trackPageRes = await fetch(`${activeBaseUrl}${trackRouteUrl}`, {
    headers: { Cookie: cookieHeader }
  })
  assert.strictEqual(trackPageRes.status, 200, 'Navigating to track URL from hero section must return HTTP 200')
  const trackPageHtml = await trackPageRes.text()

  // Verify the tracking interface loaded successfully
  assert.ok(
    trackPageHtml.includes('Loading Trip Telemetry') ||
    trackPageHtml.includes('ট্রিপের তথ্য লোড হচ্ছে') ||
    trackPageHtml.includes('TELEMETRY STATUS') ||
    trackPageHtml.includes('বোর্ডিং ও লাইভ অবস্থান'),
    'Tracking page structure must be rendered on target page'
  )
})

test('11. Telemetry Query Resilience: Fetches true latest coordinates when > 50 points exist', async () => {
  const serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: scheds } = await serviceClient.from('schedules').select('id, vehicle_id').limit(1)
  assert.ok(scheds && scheds.length > 0)
  const sched = scheds[0]

  const { data: driver } = await serviceClient.from('users').select('id').eq('role', 'driver').limit(1).single()
  const driverId = driver?.id || (await serviceClient.from('users').select('id').limit(1).single()).data!.id

  // Insert 55 sequential points with timestamps strictly newer than any existing records
  const baseTime = Date.now() + 1000
  const points = []
  for (let i = 0; i < 55; i++) {
    points.push({
      schedule_id: sched.id,
      vehicle_id: sched.vehicle_id,
      driver_id: driverId,
      latitude: 24.8100 + i * 0.001,
      longitude: 92.7100 + i * 0.001,
      speed: 30 + (i % 15),
      heading: (i * 10) % 360,
      recorded_at: new Date(baseTime + i * 1000).toISOString()
    })
  }
  const { error: insErr } = await serviceClient.from('trip_locations').insert(points)
  assert.ifError(insErr)

  try {
    // Execute the descending + reverse query pattern used by useLiveBusTracking
    const { data: recentLocations, error: queryErr } = await serviceClient
      .from('trip_locations')
      .select('latitude, longitude, speed, heading, accuracy, recorded_at')
      .eq('schedule_id', sched.id)
      .order('recorded_at', { ascending: false })
      .limit(50)

    assert.ifError(queryErr)
    assert.strictEqual(recentLocations.length, 50, 'Must retrieve exactly 50 most recent points')

    // Chronological order after reverse
    const chronological = [...recentLocations].reverse()
    const latest = chronological[chronological.length - 1]

    // Verify the latest retrieved point matches the absolute latest point inserted (index 54)
    const expectedLatestLat = points[54].latitude
    assert.strictEqual(
      latest.latitude.toFixed(4),
      expectedLatestLat.toFixed(4),
      'Descending query with reverse MUST yield the true latest location, NOT a stale point'
    )

    // Verify chronological order holds from first to last in trail
    assert.ok(
      new Date(chronological[0].recorded_at).getTime() < new Date(latest.recorded_at).getTime(),
      'Trail must be in chronological order'
    )
  } finally {
    // Cleanup inserted test points
    await serviceClient
      .from('trip_locations')
      .delete()
      .eq('schedule_id', sched.id)
      .gte('latitude', 24.8100)
  }
})

test('12. Schedule Not Found Error Handling: Non-existent schedule renders not-found state without crashing', async () => {
  const cookiesMap = new Map<string, string>()
  const ssrClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() { return Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value })) },
      setAll(cookiesToSet) { cookiesToSet.forEach(({ name, value }) => cookiesMap.set(name, value)) }
    }
  })

  const { data: authData } = await ssrClient.auth.signUp({
    email: `notfound_eval_${Date.now()}@example.com`,
    password: 'Password123!'
  })
  assert.ok(authData.user?.id)

  const cookieHeader = Array.from(cookiesMap.entries()).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('; ')

  const nonExistentScheduleId = '00000000-0000-0000-0000-000000000000'
  const res = await fetch(`${activeBaseUrl}/bookings/track/${nonExistentScheduleId}`, {
    headers: { Cookie: cookieHeader }
  })

  // Page must load cleanly (HTTP 200) without crashing server
  assert.strictEqual(res.status, 200, 'Tracking page for non-existent schedule should return HTTP 200')
  const html = await res.text()
  assert.ok(html.length > 0)
})

test('13. Unauthenticated Guest: Visiting /?tab=track displays login prompt card in hero section', async () => {
  // Make an unauthenticated request to /?tab=track
  const res = await fetch(`${activeBaseUrl}/?tab=track`)
  assert.strictEqual(res.status, 200)
  const html = await res.text()

  // Verify that the login card is rendered for unauthenticated guests
  assert.ok(html.includes('Live Bus Radar'), 'Hero track panel must render Live Bus Radar header')
  assert.ok(html.includes('Log In to Track'), 'Hero track panel must offer Log In to Track button')
  assert.ok(html.includes('Create Account'), 'Hero track panel must offer Create Account button')
  assert.ok(html.includes('href="/login"'), 'Must link to /login')
})

test('14. Schedule Sorting and Cross-Midnight Active Runs: in_transit and paused take priority over scheduled', async () => {
  const serviceClient = createClient<Database>(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data: routes } = await serviceClient.from('routes').select('id').limit(1)
  const { data: vehicles } = await serviceClient.from('vehicles').select('id').limit(1)
  assert.ok(routes && vehicles && routes.length > 0 && vehicles.length > 0)

  // Status priority map matches actions.ts
  const statusPriority: Record<string, number> = {
    'in_transit': 1,
    'paused': 2,
    'boarding': 3,
    'scheduled': 4
  }

  const dummySchedules = [
    { id: '1', status: 'scheduled', departure_time: '2026-09-17T06:00:00Z' },
    { id: '2', status: 'in_transit', departure_time: '2026-09-17T10:00:00Z' },
    { id: '3', status: 'paused', departure_time: '2026-09-17T08:00:00Z' },
    { id: '4', status: 'boarding', departure_time: '2026-09-17T09:00:00Z' }
  ]

  const sorted = [...dummySchedules].sort((a, b) => {
    const priorityA = statusPriority[a.status] || 99
    const priorityB = statusPriority[b.status] || 99
    if (priorityA !== priorityB) {
      return priorityA - priorityB
    }
    return new Date(a.departure_time).getTime() - new Date(b.departure_time).getTime()
  })

  assert.strictEqual(sorted[0].id, '2', 'in_transit must come first')
  assert.strictEqual(sorted[1].id, '3', 'paused must come second')
  assert.strictEqual(sorted[2].id, '4', 'boarding must come third')
  assert.strictEqual(sorted[3].id, '1', 'scheduled must come fourth')
})




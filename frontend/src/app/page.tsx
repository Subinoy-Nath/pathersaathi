import { createClient } from '@/utils/supabase/server'
import HomeClient from './HomeClient'

export default async function Home() {
  const supabase = await createClient()

  const [locationsResponse, vehiclesResponse] = await Promise.all([
    supabase.from('locations').select('*').is('deleted_at', null).order('name'),
    supabase.from('vehicles').select('*').is('deleted_at', null).eq('is_active', true)
  ])

  if (locationsResponse.error) {
    console.error('Failed to fetch locations:', locationsResponse.error)
  }
  if (vehiclesResponse.error) {
    console.error('Failed to fetch vehicles:', vehiclesResponse.error)
  }

  const locations = locationsResponse.data || []
  const vehicles = vehiclesResponse.data || []

  return <HomeClient locations={locations} vehicles={vehicles} />
}

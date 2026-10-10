/**
 * fetchRoadRoute.ts
 * Fetches a road-following polyline between two coordinates using the
 * OSRM public routing API (https://router.project-osrm.org).
 * No API key required. Returns an array of [lat, lng] waypoints that
 * follows real roads, suitable for Leaflet polylines.
 */

export interface LatLng {
  lat: number
  lng: number
}

/**
 * Fetches a driving route between two points using OSRM.
 * Falls back to a straight-line pair if the request fails.
 *
 * @param origin  Start coordinate
 * @param dest    End coordinate
 * @returns Array of [lat, lng] tuples following the road network
 */
export async function fetchRoadRoute(
  origin: LatLng,
  dest: LatLng
): Promise<[number, number][]> {
  try {
    // OSRM expects coordinates as lng,lat (longitude first)
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${origin.lng},${origin.lat};${dest.lng},${dest.lat}` +
      `?overview=full&geometries=geojson`

    const res = await fetch(url, {
      // 8 second timeout – if OSRM is slow, fall back gracefully
      signal: AbortSignal.timeout(8000)
    })

    if (!res.ok) throw new Error(`OSRM HTTP ${res.status}`)

    const json = await res.json()

    if (json.code !== 'Ok' || !json.routes?.length) {
      throw new Error('No route found')
    }

    // GeoJSON geometry coordinates are [lng, lat] – invert to [lat, lng] for Leaflet
    const coords: [number, number][] = json.routes[0].geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    )

    return coords
  } catch {
    // Graceful fallback: straight line between the two points
    return [
      [origin.lat, origin.lng],
      [dest.lat, dest.lng]
    ]
  }
}

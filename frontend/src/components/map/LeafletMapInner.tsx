'use client'

import React, { useEffect, useRef } from 'react'
import L from 'leaflet'
import { fetchRoadRoute } from '@/utils/fetchRoadRoute'
// leaflet.css moved to globals.css to fix Next.js global CSS console error

export interface MapPoint {
  name: string
  lat: number
  lng: number
}

export interface LeafletMapInnerProps {
  scheduleId: string
  vehicleRegistration?: string
  vehicleName?: string
  routeOrigin?: MapPoint
  routeDestination?: MapPoint
  passengerPickup?: MapPoint
  currentLocation?: {
    latitude: number
    longitude: number
    heading?: number | null
    speed?: number | null
    recorded_at?: string
  } | null
  historyCoordinates?: Array<[number, number]>
  isLive?: boolean
}

// Default Barak Valley center (Silchar area)
const DEFAULT_CENTER: [number, number] = [24.8333, 92.7789]

export default function LeafletMapInner({
  vehicleRegistration = 'Bus',
  vehicleName = 'Transit Coach',
  routeOrigin,
  routeDestination,
  passengerPickup,
  currentLocation,
  historyCoordinates = [],
  isLive = true
}: LeafletMapInnerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null)
  const mapInstanceRef = useRef<L.Map | null>(null)
  const busMarkerRef = useRef<L.Marker | null>(null)
  const originMarkerRef = useRef<L.Marker | null>(null)
  const destMarkerRef = useRef<L.Marker | null>(null)
  const pickupMarkerRef = useRef<L.Marker | null>(null)
  const historyPolylineRef = useRef<L.Polyline | null>(null)
  const plannedPolylineRef = useRef<L.Polyline | null>(null)

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return

    const initialCenter: [number, number] = currentLocation
      ? [currentLocation.latitude, currentLocation.longitude]
      : routeOrigin
      ? [routeOrigin.lat, routeOrigin.lng]
      : DEFAULT_CENTER

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: 12,
      zoomControl: true,
      attributionControl: true
    })

    // 1. Street View (OpenStreetMap)
    const streetLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    })
    streetLayer.on('tileerror', () => {}) // Graceful fallback

    // 2. Satellite Hybrid View (Esri World Imagery + Labels + Roads)
    const satelliteBase = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
    })
    const satelliteLabels = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      pane: 'overlayPane' // Ensures labels stay on top
    })
    const satelliteRoads = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      pane: 'overlayPane' // Ensures roads stay on top
    })
    
    // Group them so they toggle together as one option
    const satelliteHybrid = L.layerGroup([satelliteBase, satelliteRoads, satelliteLabels])

    // Add Street View as default
    streetLayer.addTo(map)

    // Add a layer control toggle to the map
    const baseMaps = {
      '🗺️ Street View': streetLayer,
      '🛰️ Satellite View': satelliteHybrid
    }
    L.control.layers(baseMaps, undefined, { position: 'topleft' }).addTo(map)

    mapInstanceRef.current = map

    // Force Leaflet to re-measure container after Next.js dynamic import paint
    requestAnimationFrame(() => {
      map.invalidateSize({ animate: false })
    })

    return () => {
      map.remove()
      mapInstanceRef.current = null
      busMarkerRef.current = null
      originMarkerRef.current = null
      destMarkerRef.current = null
      pickupMarkerRef.current = null
      historyPolylineRef.current = null
      plannedPolylineRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update Origin & Destination Markers and Planned Route Polyline (road-following via OSRM)
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    let cancelled = false

    // Origin Marker (Teal Pin)
    if (routeOrigin && routeOrigin.lat && routeOrigin.lng) {
      const originIcon = L.divIcon({
        className: 'origin-marker-container',
        html: `
          <div style="background:#004D40; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
            O
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      if (!originMarkerRef.current) {
        originMarkerRef.current = L.marker([routeOrigin.lat, routeOrigin.lng], { icon: originIcon })
          .addTo(map)
          .bindPopup(`<b>Origin / প্রারম্ভিক স্থান:</b><br>${routeOrigin.name}`)
      } else {
        originMarkerRef.current.setLatLng([routeOrigin.lat, routeOrigin.lng])
      }
    }

    // Destination Marker (Crimson Pin)
    if (routeDestination && routeDestination.lat && routeDestination.lng) {
      const destIcon = L.divIcon({
        className: 'dest-marker-container',
        html: `
          <div style="background:#d32f2f; color:#fff; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:12px; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
            D
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      })

      if (!destMarkerRef.current) {
        destMarkerRef.current = L.marker([routeDestination.lat, routeDestination.lng], { icon: destIcon })
          .addTo(map)
          .bindPopup(`<b>Destination / গন্তব্য:</b><br>${routeDestination.name}`)
      } else {
        destMarkerRef.current.setLatLng([routeDestination.lat, routeDestination.lng])
      }
    }

    // Passenger Pickup Marker (Amber Pin)
    if (passengerPickup && passengerPickup.lat && passengerPickup.lng) {
      const pickupIcon = L.divIcon({
        className: 'pickup-marker-container',
        html: `
          <div style="background:#f59e0b; color:#111; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size:11px; border:2px solid #fff; box-shadow:0 4px 10px rgba(0,0,0,0.3);">
            📍
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      })

      if (!pickupMarkerRef.current) {
        pickupMarkerRef.current = L.marker([passengerPickup.lat, passengerPickup.lng], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`<b>Your Boarding Point / আপনার বোর্ডিং:</b><br>${passengerPickup.name}`)
      } else {
        pickupMarkerRef.current.setLatLng([passengerPickup.lat, passengerPickup.lng])
      }
    }

    // Planned Route connecting Origin -> Destination via OSRM road network
    if (routeOrigin && routeDestination && routeOrigin.lat && routeDestination.lat) {
      // Draw a temporary straight dashed line immediately so the map shows something
      // while the road route is being fetched in the background
      const fallbackPoints: [number, number][] = [
        [routeOrigin.lat, routeOrigin.lng],
        [routeDestination.lat, routeDestination.lng]
      ]
      if (!plannedPolylineRef.current) {
        plannedPolylineRef.current = L.polyline(fallbackPoints, {
          color: '#0078FF', // Vibrant blue
          weight: 5,
          dashArray: '6, 8',
          opacity: 0.6
        }).addTo(map)
      } else {
        plannedPolylineRef.current.setLatLngs(fallbackPoints)
      }

      // Fetch the road-following route from OSRM and replace the straight line
      fetchRoadRoute(
        { lat: routeOrigin.lat, lng: routeOrigin.lng },
        { lat: routeDestination.lat, lng: routeDestination.lng }
      ).then((roadCoords) => {
        if (cancelled || !mapInstanceRef.current) return
        if (roadCoords.length > 2) {
          // More than 2 points means OSRM returned a real road path (not fallback)
          if (plannedPolylineRef.current) {
            plannedPolylineRef.current.setLatLngs(roadCoords)
            // Switch from dashed to a solid road-style line
            plannedPolylineRef.current.setStyle({
              dashArray: undefined,
              opacity: 0.85,
              weight: 5,
              color: '#0078FF'
            })
          }
        }
      })
    }

    return () => {
      cancelled = true
    }
  }, [routeOrigin, routeDestination, passengerPickup])

  // Update Live Bus Vehicle Marker & Traveled Route Polyline
  useEffect(() => {
    const map = mapInstanceRef.current
    if (!map) return

    if (!currentLocation || !currentLocation.latitude || !currentLocation.longitude) {
      return
    }

    const { latitude, longitude, heading, speed } = currentLocation
    const rot = heading && !isNaN(heading) ? Math.round(heading) : 0
    const spd = speed !== null && speed !== undefined ? Math.round(speed) : 0

    // Custom Live Vehicle DivIcon with animated pulse ring & rotation
    const busHtml = `
      <div style="position:relative; width:36px; height:36px; display:flex; align-items:center; justify-content:center;">
        ${isLive ? '<div class="bus-pulse-ring"></div>' : ''}
        <div style="
          width: 34px;
          height: 34px;
          background: #001712;
          border: 2px solid ${isLive ? '#00E676' : '#FFB300'};
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 14px rgba(0,0,0,0.5);
          transform: rotate(${rot}deg);
          transition: transform 0.4s ease-out;
        ">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${isLive ? '#00E676' : '#FFB300'}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <path d="M9 17h6"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      </div>
    `

    const busIcon = L.divIcon({
      className: 'bus-live-marker',
      html: busHtml,
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    })

    if (!busMarkerRef.current) {
      busMarkerRef.current = L.marker([latitude, longitude], { icon: busIcon, zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup(`
          <div style="font-family: sans-serif; min-width: 140px;">
            <b style="color: #004D40;">${vehicleName}</b><br/>
            <span style="font-size: 11px; color: #555;">${vehicleRegistration}</span><br/>
            <hr style="margin: 4px 0; border: none; border-top: 1px solid #ddd;"/>
            <b>Speed:</b> ${spd} km/h<br/>
            <b>Status:</b> ${isLive ? '<span style="color: #16a34a;">● Live Transmitting</span>' : '<span style="color: #ea580c;">⚠️ Signal Paused</span>'}
          </div>
        `)
      
      // Pan to bus on initial location discovery
      map.setView([latitude, longitude], 14, { animate: true })
    } else {
      busMarkerRef.current.setLatLng([latitude, longitude])
      busMarkerRef.current.setIcon(busIcon)
    }

    // Traveled History Polyline
    if (historyCoordinates.length > 1) {
      if (!historyPolylineRef.current) {
        historyPolylineRef.current = L.polyline(historyCoordinates, {
          color: '#00affe',
          weight: 5,
          opacity: 0.85
        }).addTo(map)
      } else {
        historyPolylineRef.current.setLatLngs(historyCoordinates)
      }
    }
  }, [currentLocation, historyCoordinates, isLive, vehicleName, vehicleRegistration])

  // Recenter Map Helper
  const handleRecenter = () => {
    const map = mapInstanceRef.current
    if (!map) return

    if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
      map.setView([currentLocation.latitude, currentLocation.longitude], 15, { animate: true })
      return
    }

    // Fallback: Fit all known markers
    const bounds = L.latLngBounds([])
    if (routeOrigin && routeOrigin.lat) bounds.extend([routeOrigin.lat, routeOrigin.lng])
    if (routeDestination && routeDestination.lat) bounds.extend([routeDestination.lat, routeDestination.lng])
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] })
    }
  }

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden bg-[#001712]"
      style={{ height: '450px' }}
    >
      {/* Map Surface Container */}
      <div
        ref={mapContainerRef}
        style={{ width: '100%', height: '100%', zIndex: 1 }}
      />

      {/* Map Overlay Controls */}
      <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
        <button
          type="button"
          onClick={handleRecenter}
          className="flex items-center gap-2 bg-[#001712]/90 hover:bg-[#002b22] text-[#00E676] border border-[#00E676]/40 px-3 py-2 rounded-xl text-xs font-bold shadow-lg backdrop-blur-md transition-all active:scale-95"
          title="Recenter Map to Bus Location"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="22" y1="12" x2="18" y2="12"/>
            <line x1="6" y1="12" x2="2" y2="12"/>
            <line x1="12" y1="6" x2="12" y2="2"/>
            <line x1="12" y1="22" x2="12" y2="18"/>
          </svg>
          Recenter Bus / বাসের অবস্থান
        </button>
      </div>

      {/* Live Status Pill at Bottom Left */}
      <div className="absolute bottom-4 left-4 z-[500] bg-[#001712]/90 backdrop-blur-md border border-[#00E676]/30 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-white shadow-lg">
        <span className={`w-2.5 h-2.5 rounded-full ${isLive ? 'bg-[#00E676] animate-pulse' : 'bg-[#FFB300]'}`} />
        <span className="font-mono font-semibold">
          {!currentLocation ? 'NO GPS FIX' : isLive ? 'GPS ACTIVE' : 'SIGNAL PAUSED'}
        </span>
        {currentLocation?.speed !== undefined && currentLocation?.speed !== null && (
          <span className="text-[#00E676] font-mono border-l border-white/20 pl-2">
            {Math.round(currentLocation.speed)} km/h
          </span>
        )}
      </div>
    </div>
  )
}

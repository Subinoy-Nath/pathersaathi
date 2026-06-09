'use client'

import { useState } from 'react'
import { upsertVehicle, upsertRoute, upsertSchedule } from './actions'
import Image from 'next/image'

type FleetClientProps = {
  vehicles: Record<string, any>[]
  ownedRoutes: Record<string, any>[]
  globalRoutes: Record<string, any>[]
  allRoutes: Record<string, any>[]
  locations: Record<string, any>[]
  schedules: Record<string, any>[]
  isVerified: boolean
}

export default function FleetClient({
  vehicles,
  ownedRoutes,
  globalRoutes,
  allRoutes,
  locations,
  schedules,
  isVerified,
}: FleetClientProps) {
  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes' | 'schedules'>('vehicles')
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [schedulePage, setSchedulePage] = useState(1)
  const schedulesPerPage = 10
  const totalSchedulePages = Math.ceil(schedules.length / schedulesPerPage)
  const paginatedSchedules = schedules.slice((schedulePage - 1) * schedulesPerPage, schedulePage * schedulesPerPage)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const handleVehicleSubmit = async (formData: FormData) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await upsertVehicle(formData)
      setResult(res)
      if (res.success) setShowVehicleForm(false)
    } catch {
      setResult({ error: 'An unexpected error occurred.' })
    }
    setLoading(false)
  }

  const handleRouteSubmit = async (formData: FormData) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await upsertRoute(formData)
      setResult(res)
      if (res.success) setShowRouteForm(false)
    } catch {
      setResult({ error: 'An unexpected error occurred.' })
    }
    setLoading(false)
  }

  const handleScheduleSubmit = async (formData: FormData) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await upsertSchedule(formData)
      setResult(res)
      if (res.success) setShowScheduleForm(false)
    } catch {
      setResult({ error: 'An unexpected error occurred.' })
    }
    setLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Feedback */}
      {result?.success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-100 flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          Operation completed successfully.
        </div>
      )}
      {result?.error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl font-medium border border-red-100 flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {result.error}
        </div>
      )}

      {/* Tab Navigation */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#bfc9c4]/20 p-2 inline-flex gap-1 overflow-x-auto max-w-full">
        {(['vehicles', 'routes', 'schedules'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => { setActiveTab(tab); setResult(null) }}
            className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap ${
              activeTab === tab ? 'bg-[#00342b] text-white shadow-md' : 'text-[#3f4945] hover:text-[#191c1d] hover:bg-[#f2f4f5]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Vehicles Tab */}
      <section className={`space-y-6 ${activeTab === 'vehicles' ? 'block' : 'hidden'}`}>
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#bfc9c4]/20 shadow-sm">
            <h2 className="text-xl font-bold text-[#00342b]">Your Vehicles</h2>
            <button
              onClick={() => setShowVehicleForm(!showVehicleForm)}
              className="bg-gradient-to-r from-[#004d40] to-[#00affe] text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[20px]">{showVehicleForm ? 'close' : 'add'}</span>
              {showVehicleForm ? 'Cancel' : 'Add Vehicle'}
            </button>
          </div>

          {showVehicleForm && (
            <form action={handleVehicleSubmit} className="p-8 bg-white rounded-2xl border border-[#00342b]/20 space-y-6 shadow-lg shadow-[#00342b]/5">
              <h3 className="font-bold text-lg text-[#00342b]">New Vehicle</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Vehicle Name *</label>
                  <input name="name" required minLength={2} maxLength={100}
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="e.g., Shibam Coach 11" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Vehicle Type</label>
                  <select name="vehicle_type" className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]">
                    <option value="bus">Bus</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Capacity (Seats) *</label>
                  <input name="capacity_seats" type="number" required min={1} max={100}
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="40" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Registration Number</label>
                  <input name="registration_number"
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="AS10D5047-11" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Features</label>
                  <input name="features"
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="AC • Luxury • Charging" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Image URL</label>
                  <input name="image_url"
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="https://example.com/bus.jpg" />
                  <p className="text-xs text-[#707975] mt-1">Provide a direct URL to an image of the vehicle.</p>
                </div>
              </div>
              <input type="hidden" name="is_active" value="true" />
              <div className="flex justify-end pt-4 border-t border-[#bfc9c4]/30">
                <button type="submit" disabled={loading}
                  className="bg-[#00342b] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#065043] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    'Add Vehicle'
                  )}
                </button>
              </div>
            </form>
          )}

          {vehicles.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#bfc9c4]/50">
              <span className="material-symbols-outlined text-[48px] text-[#707975] mb-3">directions_bus</span>
              <p className="text-[#3f4945] text-lg font-medium">No vehicles registered yet.</p>
              <p className="text-sm text-[#707975] mt-1">Click the button above to add your first vehicle.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {vehicles.map((v) => (
                <div key={v.id} className="glass-card electric-glow p-5 rounded-xl border border-white/40 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300">
                  <div className="w-full h-40 rounded-lg bg-[#e6e8e9] overflow-hidden relative flex items-center justify-center text-[#3f4945]">
                    {v.image_url ? (
                      <Image src={v.image_url} alt={v.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" unoptimized />
                    ) : (
                      <span className="material-symbols-outlined text-5xl">directions_bus</span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-xl text-[#00342b]">{v.name}</h3>
                    <div className="flex items-center gap-2 text-[#3f4945]">
                      <span className="material-symbols-outlined text-[18px]">license</span>
                      <span className="text-sm font-mono font-medium">{v.registration_number || 'No reg number'}</span>
                    </div>
                  </div>
                  <div className="pt-4 space-y-3 border-t border-[#bfc9c4]/30">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-1.5 text-[#006493]">
                        <span className="material-symbols-outlined text-[18px]">airline_seat_recline_extra</span>
                        <span className="font-semibold">{v.capacity_seats} Seats</span>
                      </div>
                      <span className={`px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider rounded-full ${v.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {v.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    {v.features && (
                      <div className="flex items-start gap-1.5 text-sm">
                        <span className="material-symbols-outlined text-[18px] text-[#00342b]">stars</span>
                        <span className="text-[#3f4945] font-medium truncate">{v.features}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

      {/* Routes Tab */}
      <section className={`space-y-6 ${activeTab === 'routes' ? 'block' : 'hidden'}`}>
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#bfc9c4]/20 shadow-sm">
            <h2 className="text-xl font-bold text-[#00342b]">Your Routes</h2>
            {isVerified ? (
              <button
                onClick={() => setShowRouteForm(!showRouteForm)}
                className="bg-gradient-to-r from-[#004d40] to-[#00affe] text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[20px]">{showRouteForm ? 'close' : 'add'}</span>
                {showRouteForm ? 'Cancel' : 'Add Route'}
              </button>
            ) : (
              <span className="text-xs font-bold text-yellow-700 bg-yellow-100 px-3 py-1.5 rounded-full border border-yellow-200 flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">warning</span>
                Verification required
              </span>
            )}
          </div>

          {showRouteForm && isVerified && (
            <form action={handleRouteSubmit} className="p-8 bg-white rounded-2xl border border-[#00342b]/20 space-y-6 shadow-lg shadow-[#00342b]/5">
              <h3 className="font-bold text-lg text-[#00342b]">New Route</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Origin *</label>
                  <select name="origin_id" required className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]">
                    <option value="">Select Origin</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Destination *</label>
                  <select name="destination_id" required className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]">
                    <option value="">Select Destination</option>
                    {locations.map(loc => (
                      <option key={loc.id} value={loc.id}>{loc.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Distance (km)</label>
                  <input name="distance_km" type="number" step="0.1" min="0"
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="e.g., 45.5" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Estimated Duration (mins)</label>
                  <input name="estimated_duration_mins" type="number" min="1"
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="e.g., 90" />
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-[#bfc9c4]/30">
                <button type="submit" disabled={loading}
                  className="bg-[#00342b] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#065043] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    'Create Route'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Owned Routes */}
          {ownedRoutes.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#bfc9c4]/30 overflow-hidden shadow-sm">
              <div className="bg-[#f2f4f5] px-6 py-4 border-b border-[#bfc9c4]/30">
                <h3 className="text-sm font-bold text-[#00342b] uppercase tracking-wider">Your Custom Routes</h3>
              </div>
              <div className="divide-y divide-[#bfc9c4]/20">
                {ownedRoutes.map((r) => (
                  <div key={r.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f8fafb] transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#00affe]">route</span>
                      <span className="text-lg font-bold text-[#191c1d]">{r.origin?.name} <span className="text-[#bfc9c4] mx-2">→</span> {r.destination?.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {r.distance_km && <span className="flex items-center gap-1 text-[#3f4945] bg-[#eceeef] px-3 py-1 rounded-full"><span className="material-symbols-outlined text-[16px]">straighten</span>{r.distance_km} km</span>}
                      {r.estimated_duration_mins && <span className="flex items-center gap-1 text-[#3f4945] bg-[#eceeef] px-3 py-1 rounded-full"><span className="material-symbols-outlined text-[16px]">schedule</span>{r.estimated_duration_mins} min</span>}
                      <span className="bg-[#00342b] text-white px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Owned</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Global Routes */}
          {globalRoutes.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#bfc9c4]/30 overflow-hidden shadow-sm">
              <div className="bg-[#f2f4f5] px-6 py-4 border-b border-[#bfc9c4]/30">
                <h3 className="text-sm font-bold text-[#707975] uppercase tracking-wider">System Routes (Read-Only)</h3>
              </div>
              <div className="divide-y divide-[#bfc9c4]/20">
                {globalRoutes.map((r) => (
                  <div key={r.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-[#f8fafb] transition-colors opacity-80">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-[#707975]">route</span>
                      <span className="text-base font-semibold text-[#3f4945]">{r.origin?.name} <span className="text-[#bfc9c4] mx-2">→</span> {r.destination?.name}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      {r.distance_km && <span className="text-[#707975]">{r.distance_km} km</span>}
                      {r.estimated_duration_mins && <span className="text-[#707975]"> • {r.estimated_duration_mins} min</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {ownedRoutes.length === 0 && globalRoutes.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#bfc9c4]/50">
              <span className="material-symbols-outlined text-[48px] text-[#707975] mb-3">map</span>
              <p className="text-[#3f4945] text-lg font-medium">No routes available.</p>
            </div>
          )}
        </section>

      {/* Schedules Tab */}
      <section className={`space-y-6 ${activeTab === 'schedules' ? 'block' : 'hidden'}`}>
          <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-[#bfc9c4]/20 shadow-sm">
            <h2 className="text-xl font-bold text-[#00342b]">Trip Schedules</h2>
            <button
              onClick={() => setShowScheduleForm(!showScheduleForm)}
              disabled={vehicles.length === 0 || allRoutes.length === 0}
              className="bg-gradient-to-r from-[#004d40] to-[#00affe] text-white px-5 py-2.5 rounded-xl font-semibold hover:shadow-lg hover:scale-105 transition-all text-sm flex items-center gap-1 disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-[20px]">{showScheduleForm ? 'close' : 'add'}</span>
              {showScheduleForm ? 'Cancel' : 'Add Schedule'}
            </button>
          </div>

          {vehicles.length === 0 && (
            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-xl font-medium border border-yellow-100 flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              Please add a vehicle to your fleet before creating a schedule.
            </div>
          )}

          {showScheduleForm && vehicles.length > 0 && allRoutes.length > 0 && (
            <form action={handleScheduleSubmit} className="p-8 bg-white rounded-2xl border border-[#00342b]/20 space-y-6 shadow-lg shadow-[#00342b]/5">
              <h3 className="font-bold text-lg text-[#00342b]">New Schedule</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Vehicle *</label>
                  <select name="vehicle_id" required className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]">
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.capacity_seats} seats)</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Route *</label>
                  <select name="route_id" required className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]">
                    <option value="">Select Route</option>
                    {allRoutes.map(r => (
                      <option key={r.id} value={r.id}>{r.origin?.name} → {r.destination?.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Departure Time *</label>
                  <input name="departure_time" type="datetime-local" required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Arrival Time *</label>
                  <input name="arrival_time" type="datetime-local" required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Total Seats *</label>
                  <input name="total_seats" type="number" required min={1} max={100}
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="40" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Base Fare (₹)</label>
                  <input name="base_fare" type="number" step="0.01" min="0"
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]"
                    placeholder="250.00" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#3f4945] mb-2">Repeat Daily For</label>
                  <select name="repeat_days" className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 focus:border-[#00affe] transition-all text-[#191c1d]">
                    <option value="1">No Repeat (1 Day)</option>
                    <option value="7">7 Days</option>
                    <option value="15">15 Days</option>
                    <option value="30">30 Days</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-[#bfc9c4]/30">
                <button type="submit" disabled={loading}
                  className="bg-[#00342b] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#065043] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Saving...
                    </>
                  ) : (
                    'Create Schedule'
                  )}
                </button>
              </div>
            </form>
          )}

          {schedules.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border-2 border-dashed border-[#bfc9c4]/50">
              <span className="material-symbols-outlined text-[48px] text-[#707975] mb-3">event_available</span>
              <p className="text-[#3f4945] text-lg font-medium">No schedules created yet.</p>
              <p className="text-sm text-[#707975] mt-1">Start by adding a new schedule to accept bookings.</p>
            </div>
          ) : (
            <div className="glass-card rounded-2xl border border-white/40 overflow-hidden shadow-xl shadow-[#00342b]/5">
              <div className="overflow-x-auto glass-scroll">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#00342b]/5 border-b border-[#bfc9c4]/30">
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Vehicle</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Route</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Departure</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Arrival</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-center">Seats</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-right">Fare</th>
                      <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#bfc9c4]/20">
                    {paginatedSchedules.map((s) => {
                      const originName = s.routes?.origin?.name || 'Unknown'
                      const destName = s.routes?.destination?.name || 'Unknown'
                      const depTime = s.departure_time ? new Date(s.departure_time) : null
                      const arrTime = s.arrival_time ? new Date(s.arrival_time) : null

                      return (
                        <tr key={s.id} className="hover:bg-[#00342b]/5 transition-colors group">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <span className="material-symbols-outlined text-[#00affe] text-[20px]">directions_bus</span>
                              <span className="font-bold text-[#191c1d]">{s.vehicles?.name || 'Unknown'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-[#191c1d]">{originName} → {destName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-[#191c1d]">{depTime ? depTime.toLocaleDateString('en-IN', { month: 'short', day: 'numeric'}) : '-'}</div>
                            <div className="text-xs text-[#3f4945]">{depTime ? depTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit'}) : '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm">
                            <div className="font-medium text-[#191c1d]">{arrTime ? arrTime.toLocaleDateString('en-IN', { month: 'short', day: 'numeric'}) : '-'}</div>
                            <div className="text-xs text-[#3f4945]">{arrTime ? arrTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit'}) : '-'}</div>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center gap-1 font-bold text-[#006493] bg-[#cae6ff] px-2 py-0.5 rounded text-xs">
                              {s.available_seats}/{s.total_seats}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-[#191c1d] text-right">
                            {s.base_fare ? `₹${s.base_fare}` : '-'}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${
                              s.status === 'scheduled' ? 'bg-[#afefdd] text-[#00201a]' :
                              s.status === 'completed' ? 'bg-[#cae6ff] text-[#001e30]' :
                              'bg-[#e1e3e4] text-[#3f4945]'
                            }`}>
                              {s.status}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              
              {totalSchedulePages > 1 && (
                <div className="flex justify-between items-center px-6 py-4 bg-[#f8fafb] border-t border-[#bfc9c4]/30">
                  <span className="text-sm text-[#3f4945] font-medium">
                    Showing {(schedulePage - 1) * schedulesPerPage + 1} to {Math.min(schedulePage * schedulesPerPage, schedules.length)} of {schedules.length} schedules
                  </span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSchedulePage(p => Math.max(1, p - 1))}
                      disabled={schedulePage === 1}
                      className="px-4 py-2 border border-[#bfc9c4] rounded-lg text-sm font-semibold text-[#00342b] bg-white hover:bg-[#00342b]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Previous
                    </button>
                    <button 
                      onClick={() => setSchedulePage(p => Math.min(totalSchedulePages, p + 1))}
                      disabled={schedulePage === totalSchedulePages}
                      className="px-4 py-2 border border-[#bfc9c4] rounded-lg text-sm font-semibold text-[#00342b] bg-white hover:bg-[#00342b]/5 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
    </div>
  )
}

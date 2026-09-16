'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  upsertVehicle,
  upsertRoute,
  upsertSchedule,
  createRecurringScheduleTemplate,
  toggleTemplateStatus,
  deleteRecurringScheduleTemplate,
  pauseScheduleRun,
  resumeScheduleRun,
  triggerRollingSchedules
} from './actions'
import Image from 'next/image'
import Link from 'next/link'

type FleetClientProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  vehicles: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ownedRoutes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  globalRoutes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  allRoutes: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locations: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  templates: any[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  schedules: any[]
  isVerified: boolean
}

const DAYS_MAP = [
  { id: 1, label: 'Mon' },
  { id: 2, label: 'Tue' },
  { id: 3, label: 'Wed' },
  { id: 4, label: 'Thu' },
  { id: 5, label: 'Fri' },
  { id: 6, label: 'Sat' },
  { id: 0, label: 'Sun' },
]

const PRESET_REASONS = [
  'Monsoon Flooding / Waterlogging (Dwarbond / Sonabarighat)',
  'Mechanical Breakdown / Maintenance',
  'Landslide / Road Blockage (NH-6 / NH-37)',
  'Driver Unavailability',
  'Administrative Bandh / VIP Movement',
  'Other (Custom reason)',
]

export default function FleetClient({
  vehicles,
  ownedRoutes,
  globalRoutes,
  allRoutes,
  locations,
  templates,
  schedules,
  isVerified,
}: FleetClientProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'vehicles' | 'routes' | 'schedules'>('schedules')
  const [scheduleSubTab, setScheduleSubTab] = useState<'runs' | 'templates'>('runs')

  // Modals & forms state
  const [showVehicleForm, setShowVehicleForm] = useState(false)
  const [showRouteForm, setShowRouteForm] = useState(false)
  const [showSingleScheduleForm, setShowSingleScheduleForm] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)

  // Pause run modal state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedScheduleToPause, setSelectedScheduleToPause] = useState<any | null>(null)
  const [selectedPauseReasonPreset, setSelectedPauseReasonPreset] = useState(PRESET_REASONS[0])
  const [customPauseReasonText, setCustomPauseReasonText] = useState('')
  const [broadcastAlertToHomepage, setBroadcastAlertToHomepage] = useState(true)
  const [customAlertMessage, setCustomAlertMessage] = useState('')

  // Template creation form state
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5, 6, 0])
  const [templateVehicleId, setTemplateVehicleId] = useState('')
  const [templateRouteId, setTemplateRouteId] = useState('')
  const [templateDepTime, setTemplateDepTime] = useState('07:30')
  const [templateDurationMins, setTemplateDurationMins] = useState(120)
  const [templateBaseFare, setTemplateBaseFare] = useState(120)
  const [templateTotalSeats, setTemplateTotalSeats] = useState(32)

  // Pagination for daily schedules
  const [schedulePage, setSchedulePage] = useState(1)
  const schedulesPerPage = 10
  const totalSchedulePages = Math.ceil(schedules.length / schedulesPerPage)
  const paginatedSchedules = schedules.slice((schedulePage - 1) * schedulesPerPage, schedulePage * schedulesPerPage)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<{ success?: boolean; error?: string } | null>(null)

  // Handlers
  const handleVehicleSubmit = async (formData: FormData) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await upsertVehicle(formData)
      setResult(res)
      if (res.success) {
        setShowVehicleForm(false)
        router.refresh()
      }
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
      if (res.success) {
        setShowRouteForm(false)
        router.refresh()
      }
    } catch {
      setResult({ error: 'An unexpected error occurred.' })
    }
    setLoading(false)
  }

  const handleSingleScheduleSubmit = async (formData: FormData) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await upsertSchedule(formData)
      setResult(res)
      if (res.success) {
        setShowSingleScheduleForm(false)
        router.refresh()
      }
    } catch {
      setResult({ error: 'An unexpected error occurred.' })
    }
    setLoading(false)
  }

  const handleCreateTemplateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedDays.length === 0) {
      setResult({ error: 'Please select at least one day of the week.' })
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const formData = new FormData()
      formData.set('vehicle_id', templateVehicleId)
      formData.set('route_id', templateRouteId)
      formData.set('departure_time', templateDepTime)
      formData.set('estimated_duration_mins', String(templateDurationMins))
      formData.set('base_fare', String(templateBaseFare))
      formData.set('total_seats', String(templateTotalSeats))
      formData.set('days_of_week', JSON.stringify(selectedDays))

      const res = await createRecurringScheduleTemplate(formData)
      setResult(res)
      if (res.success) {
        setShowTemplateModal(false)
        router.refresh()
      }
    } catch {
      setResult({ error: 'Failed to create template.' })
    }
    setLoading(false)
  }

  const handleToggleTemplate = async (templateId: string, currentPaused: boolean) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await toggleTemplateStatus(templateId, !currentPaused)
      setResult(res)
      if (res.success) {
        router.refresh()
      }
    } catch {
      setResult({ error: 'Failed to toggle template status.' })
    }
    setLoading(false)
  }

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this recurring schedule template?')) {
      return
    }
    setLoading(true)
    setResult(null)
    try {
      const res = await deleteRecurringScheduleTemplate(templateId)
      setResult(res)
      if (res.success) {
        router.refresh()
      }
    } catch {
      setResult({ error: 'Failed to delete template.' })
    }
    setLoading(false)
  }

  const handlePauseScheduleConfirm = async () => {
    if (!selectedScheduleToPause) return

    const reason = selectedPauseReasonPreset === 'Other (Custom reason)'
      ? customPauseReasonText.trim()
      : (customPauseReasonText.trim() ? `${selectedPauseReasonPreset}: ${customPauseReasonText.trim()}` : selectedPauseReasonPreset)

    if (!reason) {
      setResult({ error: 'Please provide a reason for pausing the schedule.' })
      return
    }

    setLoading(true)
    setResult(null)
    try {
      const res = await pauseScheduleRun(
        selectedScheduleToPause.id,
        reason,
        broadcastAlertToHomepage,
        customAlertMessage.trim() || reason
      )
      setResult(res)
      if (res.success) {
        setSelectedScheduleToPause(null)
        setCustomPauseReasonText('')
        setCustomAlertMessage('')
        router.refresh()
      }
    } catch {
      setResult({ error: 'Failed to pause schedule.' })
    }
    setLoading(false)
  }

  const handleResumeSchedule = async (scheduleId: string) => {
    setLoading(true)
    setResult(null)
    try {
      const res = await resumeScheduleRun(scheduleId)
      setResult(res)
      if (res.success) {
        router.refresh()
      }
    } catch {
      setResult({ error: 'Failed to resume schedule run.' })
    }
    setLoading(false)
  }

  const handleTriggerRolling = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await triggerRollingSchedules()
      setResult(res)
      if (res.success) {
        router.refresh()
      }
    } catch {
      setResult({ error: 'Failed to generate rolling schedules.' })
    }
    setLoading(false)
  }

  const toggleDay = (dayId: number) => {
    setSelectedDays(prev =>
      prev.includes(dayId) ? prev.filter(d => d !== dayId) : [...prev, dayId].sort((a, b) => a - b)
    )
  }

  return (
    <div className="space-y-8">
      {/* Feedback banner */}
      {result?.success && (
        <div className="p-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-200 flex items-center gap-2 shadow-sm animate-fadeIn">
          <span className="material-symbols-outlined">check_circle</span>
          Operation completed successfully.
        </div>
      )}
      {result?.error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-xl font-medium border border-red-200 flex items-center gap-2 shadow-sm animate-fadeIn">
          <span className="material-symbols-outlined">error</span>
          {result.error}
        </div>
      )}

      {/* Main Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#bfc9c4]/20 p-1.5 inline-flex gap-1 overflow-x-auto max-w-full">
          {(['schedules', 'vehicles', 'routes'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setResult(null) }}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold capitalize transition-all whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab ? 'bg-[#00342b] text-white shadow-md' : 'text-[#3f4945] hover:text-[#191c1d] hover:bg-[#f2f4f5]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">
                {tab === 'schedules' ? 'calendar_month' : tab === 'vehicles' ? 'directions_bus' : 'route'}
              </span>
              {tab === 'schedules' ? `Schedules (${schedules.length})` : tab === 'vehicles' ? `Vehicles (${vehicles.length})` : `Routes (${allRoutes.length})`}
            </button>
          ))}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SCHEDULES TAB */}
      {/* ========================================================================= */}
      <section className={`space-y-6 ${activeTab === 'schedules' ? 'block' : 'hidden'}`}>
        {/* Schedule Sub-Navigation Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-6 rounded-2xl border border-[#bfc9c4]/20 shadow-sm">
          <div className="inline-flex p-1 bg-[#f2f4f5] rounded-xl border border-[#bfc9c4]/20">
            <button
              onClick={() => setScheduleSubTab('runs')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${
                scheduleSubTab === 'runs'
                  ? 'bg-white text-[#00342b] shadow-sm'
                  : 'text-[#707975] hover:text-[#191c1d]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">event_available</span>
              Daily Run Instances ({schedules.length})
            </button>
            <button
              onClick={() => setScheduleSubTab('templates')}
              className={`px-4 py-2 rounded-lg text-xs md:text-sm font-bold transition-all flex items-center gap-2 ${
                scheduleSubTab === 'templates'
                  ? 'bg-white text-[#00342b] shadow-sm'
                  : 'text-[#707975] hover:text-[#191c1d]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">autorenew</span>
              Recurring Templates ({templates.length})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {scheduleSubTab === 'templates' ? (
              <button
                onClick={() => {
                  setShowTemplateModal(true)
                  if (vehicles.length > 0 && !templateVehicleId) {
                    setTemplateVehicleId(vehicles[0].id)
                    setTemplateTotalSeats(vehicles[0].capacity_seats)
                  }
                  if (allRoutes.length > 0 && !templateRouteId) {
                    setTemplateRouteId(allRoutes[0].id)
                  }
                }}
                disabled={vehicles.length === 0 || allRoutes.length === 0}
                className="bg-gradient-to-r from-[#004d40] to-[#00affe] text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined text-[20px]">add_circle</span>
                Add Recurring Template
              </button>
            ) : (
              <>
                <button
                  onClick={handleTriggerRolling}
                  disabled={loading}
                  title="Generate departures for next 14 days based on active recurring templates"
                  className="bg-white border border-[#00342b]/20 text-[#00342b] px-4 py-2.5 rounded-xl font-bold hover:bg-[#f2f4f5] transition-all text-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-[18px]">sync</span>
                  Refresh 14-Day Horizon
                </button>
                <button
                  onClick={() => setShowSingleScheduleForm(!showSingleScheduleForm)}
                  disabled={vehicles.length === 0 || allRoutes.length === 0}
                  className="bg-gradient-to-r from-[#004d40] to-[#00affe] text-white px-5 py-2.5 rounded-xl font-bold hover:shadow-lg hover:scale-105 transition-all text-sm flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="material-symbols-outlined text-[20px]">{showSingleScheduleForm ? 'close' : 'add'}</span>
                  {showSingleScheduleForm ? 'Cancel Single' : 'Add Single Run'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* SUBTAB 1: RECURRING TEMPLATES VIEW */}
        {/* ========================================================================= */}
        {scheduleSubTab === 'templates' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-[#00342b]/5 to-[#00affe]/10 p-5 rounded-2xl border border-[#00342b]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-[#00342b] text-base flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#00affe]">schedule</span>
                  Automated Rolling Schedule Engine
                </h3>
                <p className="text-xs text-[#3f4945] mt-1">
                  Configured templates automatically materialize concrete bus runs nightly for a 14-day rolling horizon. Pausing a template stops future generation without deleting existing bookings.
                </p>
              </div>
              <button
                onClick={handleTriggerRolling}
                disabled={loading}
                className="bg-[#00342b] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#065043] transition shrink-0 flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[16px]">play_circle</span>
                Materialize Runs Now
              </button>
            </div>

            {templates.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#bfc9c4]/50 shadow-sm p-6">
                <span className="material-symbols-outlined text-[54px] text-[#707975] mb-3">autorenew</span>
                <h3 className="text-xl font-bold text-[#00342b]">No Recurring Templates Configured</h3>
                <p className="text-[#3f4945] text-sm mt-1 max-w-md mx-auto">
                  Say goodbye to manual daily entries! Create a recurring template to automatically schedule daily departures for the next 14 days.
                </p>
                <button
                  onClick={() => {
                    setShowTemplateModal(true)
                    if (vehicles.length > 0 && !templateVehicleId) {
                      setTemplateVehicleId(vehicles[0].id)
                      setTemplateTotalSeats(vehicles[0].capacity_seats)
                    }
                    if (allRoutes.length > 0 && !templateRouteId) {
                      setTemplateRouteId(allRoutes[0].id)
                    }
                  }}
                  disabled={vehicles.length === 0 || allRoutes.length === 0}
                  className="mt-5 bg-[#00affe] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#009ae0] transition inline-flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[20px]">add</span>
                  Create First Template
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {templates.map((t) => {
                  const originName = t.routes?.origin?.name || 'Origin'
                  const destName = t.routes?.destination?.name || 'Destination'
                  const isPaused = t.is_paused

                  return (
                    <div
                      key={t.id}
                      className={`glass-card p-6 rounded-2xl border transition-all duration-300 shadow-sm flex flex-col justify-between gap-5 ${
                        isPaused ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white border-white/60'
                      }`}
                    >
                      <div className="space-y-4">
                        {/* Header info */}
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-[#006493] bg-[#cae6ff] px-2.5 py-0.5 rounded-full">
                              {t.vehicles?.name} {t.vehicles?.registration_number ? `(${t.vehicles.registration_number})` : ''}
                            </span>
                            <h4 className="text-lg font-bold text-[#00342b] mt-1.5">
                              {originName} <span className="text-[#00affe] mx-1">→</span> {destName}
                            </h4>
                          </div>
                          <span className={`px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full flex items-center gap-1 ${
                            isPaused ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-[#afefdd] text-[#00201a]'
                          }`}>
                            <span className="material-symbols-outlined text-[14px]">
                              {isPaused ? 'pause_circle' : 'check_circle'}
                            </span>
                            {isPaused ? 'Paused' : 'Active'}
                          </span>
                        </div>

                        {/* Timing and Fare metadata */}
                        <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#bfc9c4]/20 text-center">
                          <div>
                            <div className="text-[10px] uppercase font-bold text-[#707975]">Departure</div>
                            <div className="text-base font-bold text-[#00342b]">
                              {t.departure_time ? t.departure_time.slice(0, 5) : '-'}
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-[#707975]">Duration</div>
                            <div className="text-sm font-semibold text-[#191c1d]">
                              {t.estimated_duration_mins} min
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase font-bold text-[#707975]">Fare / Seats</div>
                            <div className="text-sm font-mono font-bold text-[#006493]">
                              ₹{t.base_fare} <span className="text-xs text-[#707975]">({t.total_seats}s)</span>
                            </div>
                          </div>
                        </div>

                        {/* Operating Days badges */}
                        <div>
                          <div className="text-xs font-bold text-[#3f4945] mb-2">Operating Days:</div>
                          <div className="flex flex-wrap gap-1.5">
                            {DAYS_MAP.map((d) => {
                              const active = t.days_of_week?.includes(d.id)
                              return (
                                <span
                                  key={d.id}
                                  className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors ${
                                    active
                                      ? 'bg-[#00342b] text-white shadow-xs'
                                      : 'bg-gray-100 text-gray-300'
                                  }`}
                                >
                                  {d.label}
                                </span>
                              )
                            })}
                          </div>
                        </div>

                        {/* Pause reason display */}
                        {isPaused && t.pause_reason && (
                          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                            <span className="material-symbols-outlined text-[16px] text-amber-700 shrink-0 mt-0.5">info</span>
                            <div>
                              <strong className="font-bold">Pause Reason:</strong> {t.pause_reason}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Card actions */}
                      <div className="flex items-center justify-between pt-3 border-t border-[#bfc9c4]/20">
                        <button
                          onClick={() => handleToggleTemplate(t.id, isPaused)}
                          disabled={loading}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                            isPaused
                              ? 'bg-[#00affe] text-white hover:bg-[#009ae0] shadow-sm'
                              : 'bg-amber-100 text-amber-900 hover:bg-amber-200'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[16px]">
                            {isPaused ? 'play_arrow' : 'pause'}
                          </span>
                          {isPaused ? 'Resume Template' : 'Pause Template'}
                        </button>

                        <button
                          onClick={() => handleDeleteTemplate(t.id)}
                          disabled={loading}
                          className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50 transition text-xs font-bold flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                          Delete
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* SUBTAB 2: DAILY RUN INSTANCES TABLE */}
        {/* ========================================================================= */}
        {scheduleSubTab === 'runs' && (
          <div className="space-y-6">
            {/* Single Schedule Form (Legacy manual add) */}
            {showSingleScheduleForm && vehicles.length > 0 && allRoutes.length > 0 && (
              <form action={handleSingleScheduleSubmit} className="p-8 bg-white rounded-2xl border border-[#00342b]/20 space-y-6 shadow-lg shadow-[#00342b]/5">
                <h3 className="font-bold text-lg text-[#00342b]">New Single Departure Run</h3>
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
                    </select>
                  </div>
                </div>
                <div className="flex justify-end pt-4 border-t border-[#bfc9c4]/30">
                  <button type="submit" disabled={loading}
                    className="bg-[#00342b] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#065043] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? 'Saving...' : 'Create Departure'}
                  </button>
                </div>
              </form>
            )}

            {schedules.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border-2 border-dashed border-[#bfc9c4]/50 shadow-sm p-6">
                <span className="material-symbols-outlined text-[54px] text-[#707975] mb-3">event_busy</span>
                <h3 className="text-xl font-bold text-[#00342b]">No Departures Materialized</h3>
                <p className="text-[#3f4945] text-sm mt-1 max-w-md mx-auto">
                  There are no scheduled runs in the database. You can generate them from a recurring template or add a single run manually.
                </p>
                <div className="mt-5 flex justify-center gap-3">
                  <button
                    onClick={() => setScheduleSubTab('templates')}
                    className="bg-[#00342b] text-white px-6 py-2.5 rounded-xl font-bold shadow-md hover:bg-[#065043] transition"
                  >
                    Go to Recurring Templates
                  </button>
                </div>
              </div>
            ) : (
              <div className="glass-card rounded-2xl border border-white/40 overflow-hidden shadow-xl shadow-[#00342b]/5">
                <div className="overflow-x-auto glass-scroll">
                  <table className="w-full text-left border-collapse block md:table">
                    <thead className="hidden md:table-header-group">
                      <tr className="bg-[#00342b]/5 border-b border-[#bfc9c4]/30">
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Vehicle</th>
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Route</th>
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Departure</th>
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold">Arrival</th>
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-center">Seats</th>
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-right">Fare</th>
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-center">Status</th>
                        <th className="px-6 py-4 text-sm text-[#00342b] font-bold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#bfc9c4]/20">
                      {paginatedSchedules.map((s) => {
                        const originName = s.routes?.origin?.name || 'Unknown'
                        const destName = s.routes?.destination?.name || 'Unknown'
                        const depTime = s.departure_time ? new Date(s.departure_time) : null
                        const arrTime = s.arrival_time ? new Date(s.arrival_time) : null
                        const isPaused = s.status === 'paused'
                        const isScheduled = s.status === 'scheduled'
                        const isInTransit = s.status === 'in_transit'

                        return (
                          <tr
                            key={s.id}
                            className={`hover:bg-[#00342b]/5 transition-colors group block md:table-row rounded-2xl md:rounded-none border border-white/60 md:border-none p-4 mb-4 md:mb-0 shadow-sm md:shadow-none ${
                              isPaused ? 'bg-amber-500/5' : 'bg-white/40 md:bg-transparent'
                            }`}
                          >
                            {/* Vehicle */}
                            <td className="px-0 md:px-6 py-2 md:py-4 block md:table-cell border-b border-[#bfc9c4]/20 md:border-none">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Vehicle</div>
                              <div className="flex items-center gap-2">
                                <span className="material-symbols-outlined text-[#00affe] text-[20px]">directions_bus</span>
                                <div>
                                  <div className="font-bold text-[#191c1d]">{s.vehicles?.name || 'Unknown'}</div>
                                  {s.template_id && (
                                    <span className="text-[10px] font-semibold text-[#006493] flex items-center gap-0.5">
                                      <span className="material-symbols-outlined text-[12px]">autorenew</span>
                                      Recurring
                                    </span>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* Route */}
                            <td className="px-0 md:px-6 py-3 md:py-4 block md:table-cell border-b border-[#bfc9c4]/20 md:border-none">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Route</div>
                              <div className="flex flex-col">
                                <span className="text-sm font-semibold text-[#191c1d]">{originName} → {destName}</span>
                              </div>
                            </td>

                            {/* Departure */}
                            <td className="px-0 md:px-6 py-3 md:py-4 text-sm block md:table-cell border-b border-[#bfc9c4]/20 md:border-none">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Departure</div>
                              <div className="font-medium text-[#191c1d]">{depTime ? depTime.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', weekday: 'short' }) : '-'}</div>
                              <div className="text-xs font-bold text-[#00342b]">{depTime ? depTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                            </td>

                            {/* Arrival */}
                            <td className="px-0 md:px-6 py-3 md:py-4 text-sm block md:table-cell border-b border-[#bfc9c4]/20 md:border-none">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Arrival</div>
                              <div className="font-medium text-[#191c1d]">{arrTime ? arrTime.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : '-'}</div>
                              <div className="text-xs text-[#3f4945]">{arrTime ? arrTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '-'}</div>
                            </td>

                            {/* Seats */}
                            <td className="px-0 md:px-6 py-3 md:py-4 text-left md:text-center block md:table-cell border-b border-[#bfc9c4]/20 md:border-none">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Seats</div>
                              <span className="inline-flex items-center gap-1 font-bold text-[#006493] bg-[#cae6ff] px-2.5 py-0.5 rounded-full text-xs">
                                {s.available_seats}/{s.total_seats}
                              </span>
                            </td>

                            {/* Fare */}
                            <td className="px-0 md:px-6 py-3 md:py-4 font-mono font-bold text-[#191c1d] text-left md:text-right block md:table-cell border-b border-[#bfc9c4]/20 md:border-none">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Fare</div>
                              {s.base_fare ? `₹${s.base_fare}` : '-'}
                            </td>

                            {/* Status */}
                            <td className="px-0 md:px-6 py-4 text-left md:text-center block md:table-cell">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Status</div>
                              <div className="flex flex-col items-center gap-1">
                                <span className={`inline-flex items-center gap-1 px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${
                                  isScheduled ? 'bg-[#afefdd] text-[#00201a]' :
                                  isPaused ? 'bg-amber-100 text-amber-800 border border-amber-300 shadow-xs' :
                                  isInTransit ? 'bg-blue-100 text-blue-800 animate-pulse' :
                                  s.status === 'completed' ? 'bg-[#cae6ff] text-[#001e30]' :
                                  s.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                  'bg-[#e1e3e4] text-[#3f4945]'
                                }`}>
                                  {isPaused && <span className="material-symbols-outlined text-[14px]">warning</span>}
                                  {isInTransit && <span className="material-symbols-outlined text-[14px]">sensors</span>}
                                  {s.status}
                                </span>
                                {isPaused && s.pause_reason && (
                                  <span className="text-[11px] text-amber-900 font-medium max-w-[150px] truncate" title={s.pause_reason}>
                                    {s.pause_reason}
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Operational Actions */}
                            <td className="px-0 md:px-6 py-4 text-left md:text-center block md:table-cell">
                              <div className="md:hidden text-[10px] font-bold text-[#3f4945] uppercase tracking-wider mb-1">Actions</div>
                              <div className="flex items-center justify-center gap-2">
                                {isScheduled && (
                                  <button
                                    onClick={() => setSelectedScheduleToPause(s)}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-900 hover:bg-amber-500/20 border border-amber-500/30 transition flex items-center gap-1"
                                    title="Pause this scheduled run with public announcement"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">pause</span>
                                    Pause Run
                                  </button>
                                )}

                                {isPaused && (
                                  <button
                                    onClick={() => handleResumeSchedule(s.id)}
                                    disabled={loading}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-800 hover:bg-green-200 border border-green-300 transition flex items-center gap-1 shadow-xs"
                                    title="Resume this departure and clear alerts"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">play_arrow</span>
                                    Resume Run
                                  </button>
                                )}

                                {isInTransit && (
                                  <Link
                                    href={`/bookings/track/${s.id}`}
                                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00affe] text-white hover:bg-[#009ae0] transition flex items-center gap-1 shadow-sm"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">navigation</span>
                                    Live Track
                                  </Link>
                                )}

                                {!isScheduled && !isPaused && !isInTransit && (
                                  <span className="text-xs text-[#707975] font-medium">—</span>
                                )}
                              </div>
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
                      Showing {(schedulePage - 1) * schedulesPerPage + 1} to {Math.min(schedulePage * schedulesPerPage, schedules.length)} of {schedules.length} departures
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
          </div>
        )}
      </section>

      {/* ========================================================================= */}
      {/* VEHICLES TAB */}
      {/* ========================================================================= */}
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
                  placeholder="/images/bus1.jpg" />
                <p className="text-xs text-[#707975] mt-1">Provide a relative path like /images/bus1.jpg</p>
              </div>
            </div>
            <input type="hidden" name="is_active" value="true" />
            <div className="flex justify-end pt-4 border-t border-[#bfc9c4]/30">
              <button type="submit" disabled={loading}
                className="bg-[#00342b] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#065043] transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Saving...' : 'Add Vehicle'}
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
              <div key={v.id} className="glass-card p-5 rounded-xl border border-white/40 flex flex-col gap-4 group hover:-translate-y-1 transition-transform duration-300">
                <div className="w-full h-40 rounded-lg bg-[#e6e8e9] overflow-hidden relative flex items-center justify-center text-[#3f4945]">
                  {v.image_url ? (
                    <Image src={v.image_url} alt={v.name} fill className="object-contain p-2 group-hover:scale-105 transition-transform duration-500" unoptimized />
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

      {/* ========================================================================= */}
      {/* ROUTES TAB */}
      {/* ========================================================================= */}
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
                {loading ? 'Saving...' : 'Create Route'}
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
      </section>

      {/* ========================================================================= */}
      {/* MODAL 1: CREATE RECURRING TEMPLATE MODAL */}
      {/* ========================================================================= */}
      {showTemplateModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 md:p-8 shadow-2xl border border-white/60 space-y-6 my-8 animate-scaleUp">
            <div className="flex items-start justify-between border-b border-[#bfc9c4]/20 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#00affe] bg-[#00affe]/10 px-3 py-1 rounded-full">
                  Automated Schedule Rule
                </span>
                <h3 className="text-2xl font-bold text-[#00342b] mt-2">Create Recurring Schedule Template</h3>
                <p className="text-xs text-[#3f4945] mt-1">
                  Runs will automatically materialize every night for the next 14 days on a rolling basis.
                </p>
              </div>
              <button
                onClick={() => setShowTemplateModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-[#707975] hover:text-[#191c1d] transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateTemplateSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Vehicle */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">1. Vehicle *</label>
                  <select
                    value={templateVehicleId}
                    onChange={(e) => {
                      setTemplateVehicleId(e.target.value)
                      const v = vehicles.find(veh => veh.id === e.target.value)
                      if (v) setTemplateTotalSeats(v.capacity_seats)
                    }}
                    required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 text-sm font-semibold text-[#191c1d]"
                  >
                    <option value="">Select Vehicle</option>
                    {vehicles.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.capacity_seats} seats)</option>
                    ))}
                  </select>
                </div>

                {/* Route */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">2. Route *</label>
                  <select
                    value={templateRouteId}
                    onChange={(e) => {
                      setTemplateRouteId(e.target.value)
                      const r = allRoutes.find(rt => rt.id === e.target.value)
                      if (r?.estimated_duration_mins) {
                        setTemplateDurationMins(r.estimated_duration_mins)
                      }
                    }}
                    required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 text-sm font-semibold text-[#191c1d]"
                  >
                    <option value="">Select Route</option>
                    {allRoutes.map(r => (
                      <option key={r.id} value={r.id}>{r.origin?.name} → {r.destination?.name}</option>
                    ))}
                  </select>
                </div>

                {/* Departure Time */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">3. Departure Time *</label>
                  <input
                    type="time"
                    value={templateDepTime}
                    onChange={(e) => setTemplateDepTime(e.target.value)}
                    required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 text-sm font-semibold text-[#191c1d]"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">4. Estimated Duration (mins) *</label>
                  <input
                    type="number"
                    min={1}
                    value={templateDurationMins}
                    onChange={(e) => setTemplateDurationMins(parseInt(e.target.value) || 0)}
                    required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 text-sm font-semibold text-[#191c1d]"
                    placeholder="120"
                  />
                </div>
              </div>

              {/* Operating Days Selector */}
              <div className="p-4 bg-[#f8fafb] rounded-2xl border border-[#bfc9c4]/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#00342b]">
                    5. Operating Days of Week *
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setSelectedDays([1, 2, 3, 4, 5, 6, 0])}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-[#bfc9c4] text-[#00342b] hover:bg-[#e6e8e9]"
                    >
                      Everyday
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([1, 2, 3, 4, 5])}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-[#bfc9c4] text-[#00342b] hover:bg-[#e6e8e9]"
                    >
                      Weekdays (M-F)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedDays([6, 0])}
                      className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-white border border-[#bfc9c4] text-[#00342b] hover:bg-[#e6e8e9]"
                    >
                      Weekends
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 pt-1">
                  {DAYS_MAP.map((d) => {
                    const isSelected = selectedDays.includes(d.id)
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDay(d.id)}
                        className={`p-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center gap-1 ${
                          isSelected
                            ? 'bg-[#00342b] text-white border-[#00342b] shadow-xs'
                            : 'bg-white text-[#707975] border-[#bfc9c4]/50 hover:bg-gray-50'
                        }`}
                      >
                        <span>{d.label}</span>
                        <span className="material-symbols-outlined text-[14px]">
                          {isSelected ? 'check_circle' : 'circle'}
                        </span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Base Fare & Total Seats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">6. Base Fare (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    value={templateBaseFare}
                    onChange={(e) => setTemplateBaseFare(parseFloat(e.target.value) || 0)}
                    required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 text-sm font-semibold text-[#191c1d]"
                    placeholder="120.00"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">7. Bookable Seats *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={templateTotalSeats}
                    onChange={(e) => setTemplateTotalSeats(parseInt(e.target.value) || 1)}
                    required
                    className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe]/50 text-sm font-semibold text-[#191c1d]"
                    placeholder="32"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#bfc9c4]/20">
                <button
                  type="button"
                  onClick={() => setShowTemplateModal(false)}
                  className="px-6 py-3 rounded-xl border border-[#bfc9c4] text-sm font-semibold text-[#3f4945] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gradient-to-r from-[#00342b] to-[#004d40] text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">autorenew</span>
                  {loading ? 'Saving & Materializing...' : 'Save & Materialize Runs'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: PAUSE RUN & BROADCAST ALERT MODAL */}
      {/* ========================================================================= */}
      {selectedScheduleToPause && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl border border-white/60 space-y-6 my-8 animate-scaleUp">
            <div className="flex items-start justify-between border-b border-[#bfc9c4]/20 pb-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full flex items-center gap-1 w-fit">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  Service Suspension Notice
                </span>
                <h3 className="text-2xl font-bold text-[#00342b] mt-2">Pause Departure Run</h3>
                <p className="text-xs text-[#3f4945] mt-1">
                  Target: {selectedScheduleToPause.vehicles?.name} • {selectedScheduleToPause.routes?.origin?.name} → {selectedScheduleToPause.routes?.destination?.name}
                </p>
              </div>
              <button
                onClick={() => setSelectedScheduleToPause(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-[#707975] hover:text-[#191c1d] transition"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="space-y-5">
              {/* Preset Reason Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">
                  1. Reason for Suspension *
                </label>
                <select
                  value={selectedPauseReasonPreset}
                  onChange={(e) => setSelectedPauseReasonPreset(e.target.value)}
                  className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500/50 text-sm font-semibold text-[#191c1d]"
                >
                  {PRESET_REASONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>

              {/* Custom Details */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-[#3f4945] mb-2">
                  2. Operational Details / Explanation (Optional)
                </label>
                <textarea
                  rows={2}
                  value={customPauseReasonText}
                  onChange={(e) => setCustomPauseReasonText(e.target.value)}
                  placeholder="e.g., Heavy monsoon rainfall caused waterlogging near Dwarbond. Road impassable by bus."
                  className="w-full border border-[#bfc9c4] bg-[#f8fafb] rounded-xl px-4 py-2.5 outline-none focus:ring-2 focus:ring-amber-500/50 text-sm text-[#191c1d]"
                />
              </div>

              {/* Broadcast Alert Toggle */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200/80 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={broadcastAlertToHomepage}
                    onChange={(e) => setBroadcastAlertToHomepage(e.target.checked)}
                    className="w-4 h-4 text-amber-600 rounded border-gray-300 focus:ring-amber-500"
                  />
                  <div className="text-xs font-bold text-amber-950">
                    Broadcast alert to passengers on Homepage & Search results
                  </div>
                </label>

                {broadcastAlertToHomepage && (
                  <div className="space-y-2 pt-2 border-t border-amber-200/60">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-amber-900">
                      Live Passenger Alert Preview:
                    </label>
                    <div className="p-3.5 bg-white rounded-xl border border-amber-300 shadow-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-600 text-white">
                          SERVICE ADVISORY
                        </span>
                        <span className="text-[11px] font-bold text-[#00342b]">
                          {selectedScheduleToPause.routes?.origin?.name} ↔ {selectedScheduleToPause.routes?.destination?.name}
                        </span>
                      </div>
                      <p className="text-xs text-[#3f4945]">
                        {customPauseReasonText.trim()
                          ? `${selectedPauseReasonPreset}: ${customPauseReasonText.trim()}`
                          : selectedPauseReasonPreset}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#bfc9c4]/20">
                <button
                  type="button"
                  onClick={() => setSelectedScheduleToPause(null)}
                  className="px-6 py-3 rounded-xl border border-[#bfc9c4] text-sm font-semibold text-[#3f4945] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handlePauseScheduleConfirm}
                  disabled={loading}
                  className="bg-amber-600 hover:bg-amber-700 text-white px-8 py-3 rounded-xl font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">pause_circle</span>
                  {loading ? 'Pausing...' : 'Confirm Pause & Broadcast'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

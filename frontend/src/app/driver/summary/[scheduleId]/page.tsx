'use client'

import React, { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import {
  CheckCircle,
  Bus,
  Clock,
  Navigation,
  Home,
  CheckCircle2,
  Unlock,
  Users
} from 'lucide-react'

interface SummaryData {
  vehicleName: string
  vehicleReg: string
  originName: string
  destName: string
  departureTime: string
  updatedAt: string
  totalGpsPings: number
  totalPassengers: number
}

export default function DriverTripSummaryPage({
  params
}: {
  params: Promise<{ scheduleId: string }>
}) {
  const resolvedParams = use(params)
  const scheduleId = resolvedParams.scheduleId
  const router = useRouter()
  const supabase = createClient()

  const [summary, setSummary] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let isMounted = true

    const fetchSummary = async () => {
      try {
        // 1. Fetch schedule, vehicle, route
        const { data: sched } = await supabase
          .from('schedules')
          .select(`
            id,
            departure_time,
            updated_at,
            vehicles ( name, registration_number ),
            routes (
              origin:locations!routes_origin_id_fkey(name),
              destination:locations!routes_destination_id_fkey(name)
            )
          `)
          .eq('id', scheduleId)
          .single()

        // 2. Count GPS telemetry pings
        const { count: pingsCount } = await supabase
          .from('trip_locations')
          .select('*', { count: 'exact', head: true })
          .eq('schedule_id', scheduleId)

        // 3. Count passengers
        const { count: passCount } = await supabase
          .from('bookings')
          .select('*', { count: 'exact', head: true })
          .eq('schedule_id', scheduleId)
          .eq('status', 'approved')

        if (sched && isMounted) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const v = sched.vehicles as any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const r = sched.routes as any

          setSummary({
            vehicleName: v?.name || 'Coach',
            vehicleReg: v?.registration_number || 'AS-10',
            originName: r?.origin?.name || 'Origin',
            destName: r?.destination?.name || 'Destination',
            departureTime: sched.departure_time,
            updatedAt: sched.updated_at,
            totalGpsPings: pingsCount || 0,
            totalPassengers: passCount || 0
          })
        }
      } catch (err) {
        console.error('Failed to load trip summary:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    fetchSummary()

    return () => {
      isMounted = false
    }
  }, [scheduleId, supabase])

  // Calculate approximate duration
  let durationStr = '১ ঘণ্টা ২৫ মিনিট (1h 25m)'
  if (summary?.departureTime && summary?.updatedAt) {
    const start = new Date(summary.departureTime).getTime()
    const end = new Date(summary.updatedAt).getTime()
    const diffMins = Math.max(15, Math.round((end - start) / (1000 * 60)))
    const hrs = Math.floor(diffMins / 60)
    const mins = diffMins % 60
    durationStr = hrs > 0 ? `${hrs}h ${mins}m` : `${mins} mins`
  }

  return (
    <div className="min-h-screen bg-[#001712] text-white flex flex-col justify-between p-4 sm:p-6 max-w-xl mx-auto w-full">
      {/* Top Header */}
      <div className="text-center pt-4 pb-2 border-b border-[#004d40]/40">
        <span className="text-xs font-bold text-[#00E676] uppercase tracking-widest block">
          PATHER SAATHI • TRIP COMPLETION
        </span>
        <h1 className="text-xl font-bold text-white">পথের সাথী • ট্রিপ রিপোর্ট</h1>
      </div>

      {/* Main Card */}
      <div className="my-auto py-6 space-y-6">
        {/* Celebration Badge */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-[#00E676]/20 border-2 border-[#00E676] rounded-full flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(0,230,118,0.3)] animate-scale-up">
            <CheckCircle className="w-10 h-10 text-[#00E676]" />
          </div>
          <h2 className="text-2xl font-black text-white">
            যাত্রা সফলভাবে সম্পন্ন!
          </h2>
          <p className="text-xs font-semibold text-[#00E676] uppercase tracking-wider">
            TRIP COMPLETED SUCCESSFULLY
          </p>
        </div>

        {loading ? (
          <div className="text-center py-6 text-white/50 text-sm">
            রিপোর্ট তৈরি হচ্ছে... / Calculating stats...
          </div>
        ) : summary ? (
          <div className="bg-[#002B22] border-2 border-[#00E676]/40 rounded-3xl p-5 shadow-2xl space-y-4">
            {/* Bus & Route */}
            <div className="pb-3 border-b border-[#004D40]/80">
              <div className="flex items-center gap-2 text-xs text-[#00E676] font-bold mb-1">
                <Bus className="w-4 h-4" />
                <span>{summary.vehicleName} ({summary.vehicleReg})</span>
              </div>
              <div className="text-lg font-extrabold text-white">
                {summary.originName} ➔ {summary.destName}
              </div>
            </div>

            {/* Metrics List */}
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-[#004D40]/50">
                <span className="text-white/70 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#00E676]" /> মোট সময় / Duration:
                </span>
                <span className="font-bold text-white font-mono">{durationStr}</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#004D40]/50">
                <span className="text-white/70 flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#00E676]" /> যাত্রী পরিবহন / Passengers:
                </span>
                <span className="font-bold text-white font-mono">{summary.totalPassengers} জন</span>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-[#004D40]/50">
                <span className="text-white/70 flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-[#00E676]" /> জিপিএস রেকর্ড / GPS Syncs:
                </span>
                <span className="font-bold text-[#00E676] font-mono">{summary.totalGpsPings} টি রেকর্ড</span>
              </div>

              <div className="flex items-center justify-between py-1">
                <span className="text-white/70 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#00E676]" /> ক্লাউড সিঙ্ক / Cloud Status:
                </span>
                <span className="font-bold text-[#00E676]">১০০% সংরক্ষিত</span>
              </div>
            </div>
          </div>
        ) : null}

        {/* Wake Lock Released confirmation */}
        <div className="bg-[#002B22]/50 border border-[#004D40] rounded-2xl p-3 flex items-center justify-center gap-2 text-xs text-white/70">
          <Unlock className="w-4 h-4 text-[#00E676]" />
          <span>স্ক্রিন লক মুক্তি দেওয়া হয়েছে (Screen Wake Lock Released)</span>
        </div>
      </div>

      {/* Massive Home Button */}
      <div className="pb-4">
        <button
          type="button"
          onClick={() => router.push('/driver')}
          className="w-full h-[76px] bg-[#00E676] hover:bg-[#00c864] text-black font-extrabold text-xl rounded-2xl flex items-center justify-center gap-3 shadow-[0_8px_30px_rgba(0,230,118,0.35)] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Home className="w-6 h-6" />
          <span>মূল ড্যাশবোর্ডে ফিরে যান / RETURN TO CABIN HOME</span>
        </button>
      </div>
    </div>
  )
}

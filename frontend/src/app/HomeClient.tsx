"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { Database } from '@/types/database.types';
import { createTicketBooking, createWholeVehicleBooking, searchSchedules, getTodaySchedules, TodayScheduleItem } from "./actions";
import { createClient } from "@/utils/supabase/client";
import { useAutoAnimate } from '@formkit/auto-animate/react';
import BroadcastAlertBanner, { BroadcastNotificationItem } from "@/components/common/BroadcastAlertBanner";

type Location = Database['public']['Tables']['locations']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

interface HomeClientProps {
  locations: Location[];
  vehicles: Vehicle[];
  initialBroadcasts?: BroadcastNotificationItem[];
  initialUser?: { id: string; email?: string } | null;
  initialTodaySchedules?: TodayScheduleItem[];
  initialTab?: 'book' | 'track';
}

type BookingResult = {
  success: boolean;
  error?: string;
  booking_reference?: string;
  operator_whatsapp?: string;
  vehicle_names?: string;
  message?: string;
};

export default function HomeClient({
  locations,
  vehicles,
  initialBroadcasts = [],
  initialUser = null,
  initialTodaySchedules = [],
  initialTab = 'book'
}: HomeClientProps) {
  const [currentUser, setCurrentUser] = useState<{ id: string; email?: string } | null>(initialUser || null);
  const [todaySchedules, setTodaySchedules] = useState<TodayScheduleItem[]>(initialTodaySchedules || []);
  const [trackLoading, setTrackLoading] = useState(false);
  const [heroTab, setHeroTab] = useState<'book' | 'track'>(initialTab);
  const currentUserRef = useRef<{ id: string; email?: string } | null>(initialUser || null);

  const sortedVehicles = useMemo(() => {
    return [...(vehicles || [])].sort((a, b) =>
      (a.name || '').localeCompare(b.name || '', undefined, { numeric: true, sensitivity: 'base' })
    );
  }, [vehicles]);

  const switchHeroTab = (tab: 'book' | 'track') => {
    setHeroTab(tab);
    if (tab === 'track' && currentUserRef.current && (!todaySchedules || todaySchedules.length === 0)) {
      refreshTodaySchedules();
    }
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      if (tab === 'track') {
        url.searchParams.set('tab', 'track');
      } else {
        url.searchParams.delete('tab');
      }
      window.history.replaceState(null, '', url.pathname + url.search);
    }
  };

  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);
  const [selectedOccasion, setSelectedOccasion] = useState<string>('');

  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketResult, setTicketResult] = useState<BookingResult | null>(null);

  const [searchStep, setSearchStep] = useState<0 | 1>(0);
  
  type AvailableSchedule = {
    id: string;
    departure_time: string;
    arrival_time: string;
    available_seats: number;
    base_fare: number | null;
    vehicles: { name: string; registration_number: string | null; is_ac?: boolean } | null;
  };

  const [availableSchedules, setAvailableSchedules] = useState<AvailableSchedule[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  
  const getTodayString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [searchParams, setSearchParams] = useState({ seats: '1', travelDate: getTodayString() });

  const [busLoading, setBusLoading] = useState(false);
  const [busResult, setBusResult] = useState<BookingResult | null>(null);

  const busesRef = useRef<HTMLElement | null>(null);
  const heroCardRef = useRef<HTMLDivElement | null>(null);
  const [parent] = useAutoAnimate();

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUser({ id: user.id, email: user.email });
        currentUserRef.current = { id: user.id, email: user.email };
        if (todaySchedules.length === 0) {
          getTodaySchedules().then((res) => {
            if (res.success && res.schedules) {
              setTodaySchedules(res.schedules);
            }
          });
        }
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        const loggedUser = { id: u.id, email: u.email };
        setCurrentUser(loggedUser);
        currentUserRef.current = loggedUser;
        getTodaySchedules().then((res) => {
          if (res.success && res.schedules) {
            setTodaySchedules(res.schedules);
          }
        });
      } else {
        setCurrentUser(null);
        currentUserRef.current = null;
        setTodaySchedules([]);
      }
    });

    // Subscribe to realtime changes on schedules table so hero section updates live
    const channelName = `home-today-schedules-${Date.now()}`;
    const schedulesChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'schedules'
        },
        () => {
          // Guard: Only query server action if user is authenticated
          if (currentUserRef.current) {
            getTodaySchedules().then((res) => {
              if (res.success && res.schedules) {
                setTodaySchedules(res.schedules);
              }
            });
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(schedulesChannel);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const refreshTodaySchedules = async () => {
    setTrackLoading(true);
    try {
      const res = await getTodaySchedules();
      if (res.success && res.schedules) {
        setTodaySchedules(res.schedules);
      }
    } catch (err) {
      console.error('Failed to refresh today schedules:', err);
    } finally {
      setTrackLoading(false);
    }
  };

  const handleHeroTrackCta = () => {
    switchHeroTab('track');
    if (typeof window !== 'undefined' && window.innerWidth < 1024 && heroCardRef.current) {
      heroCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleBusSelection = (busId: string) => {

    setSelectedBuses((prev) =>
      prev.includes(busId)
        ? prev.filter((id) => id !== busId)
        : [...prev, busId]
    );
  };

  const scrollToBuses = () => {
    if (busesRef.current) {
      const y = busesRef.current.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: y, behavior: "smooth" });
    }
  };

  const handleSearch = async (formData: FormData) => {
    setSearchLoading(true);
    setTicketResult(null);

    const pickup = formData.get('pickup') as string;
    const destination = formData.get('destination') as string;
    const travelDate = formData.get('travelDate') as string;
    const seatsStr = formData.get('seats') as string;
    const seats = parseInt(seatsStr || '1');
    
    setSearchParams({ seats: seatsStr || '1', travelDate });

    const result = await searchSchedules(pickup, destination, travelDate, seats);
    
    if (result.success && result.schedules) {
      setAvailableSchedules(result.schedules);
      setSearchStep(1);
    } else {
      setTicketResult({ success: false, error: result.error || 'Failed to search buses.' });
    }
    setSearchLoading(false);
  };

  const handleTicketBooking = async (formData: FormData) => {
    setTicketLoading(true);
    setTicketResult(null);
    try {
      const result = await createTicketBooking(formData);
      setTicketResult(result);
    } catch {
      setTicketResult({ success: false, error: 'An unexpected error occurred.' });
    }
    setTicketLoading(false);
  };

  const handleWholeVehicleBooking = async (formData: FormData) => {
    if (selectedBuses.length === 0) {
      setBusResult({ success: false, error: 'Please select at least one bus.' });
      return;
    }
    setBusLoading(true);
    setBusResult(null);
    formData.set('vehicleIds', JSON.stringify(selectedBuses));
    try {
      const result = await createWholeVehicleBooking(formData);
      if (result.success) {
        setSelectedBuses([]);
      }
      setBusResult(result);
    } catch (e) {
      console.error('Error in createWholeVehicleBooking:', e);
      setBusResult({ success: false, error: 'An unexpected error occurred.' });
    }
    setBusLoading(false);
  };

  return (
    <main className="pt-20 font-sans text-[#191c1d]">
      <BroadcastAlertBanner initialBroadcasts={initialBroadcasts} />

      {/* Hero Section with Map Gradient */}
      <section className="relative min-h-[650px] lg:min-h-screen flex items-center justify-center overflow-hidden pt-6 pb-16">
        {/* Dynamic Gradient Background */}
        <div className="absolute inset-0 primary-gradient opacity-10"></div>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #00affe 0%, transparent 50%), radial-gradient(circle at 80% 80%, #004d40 0%, transparent 50%)" }}></div>

        <div className="container mx-auto px-5 lg:px-10 z-10 grid lg:grid-cols-2 gap-12 items-center relative">
          <div className="space-y-8 pt-10 lg:pt-0 text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-[#00342b] tracking-tight">
              Your Trusted <span className="text-[#006493]">Bus Booking</span> Platform.
            </h1>
            <p className="text-lg lg:text-xl text-[#3f4945] max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Easy and reliable bus ticket booking across Silchar and Barak Valley. Safe, comfortable journeys every time.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full glass border border-white/40 shadow-sm hover:scale-105 transition-transform cursor-default">
                <span className="material-symbols-outlined text-[#006493] text-[22px]">verified_user</span>
                <span className="text-sm lg:text-base font-semibold text-[#00342b]">Verified Buses</span>
              </div>
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full glass border border-white/40 shadow-sm hover:scale-105 transition-transform cursor-default">
                <span className="material-symbols-outlined text-[#006493] text-[22px]">task_alt</span>
                <span className="text-sm lg:text-base font-semibold text-[#00342b]">Instant Booking</span>
              </div>
              <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full glass border border-white/40 shadow-sm hover:scale-105 transition-transform cursor-default">
                <span className="material-symbols-outlined text-[#006493] text-[22px]">support_agent</span>
                <span className="text-sm lg:text-base font-semibold text-[#00342b]">24/7 Support</span>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2">
              <button
                type="button"
                onClick={scrollToBuses}
                className="group px-8 py-3.5 rounded-full border-2 border-[#006493] text-[#006493] font-bold text-base hover:bg-[#006493] hover:text-white transition-all duration-300 shadow-sm flex items-center justify-center gap-2"
              >
                Book a Whole Bus <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
              </button>
              <button
                type="button"
                onClick={handleHeroTrackCta}
                className="px-8 py-3.5 rounded-full bg-[#004d40] text-white font-bold text-base hover:bg-[#00382d] transition-all duration-300 shadow-md flex items-center justify-center gap-2.5"
                data-testid="hero-track-live-cta"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E676]"></span>
                </span>
                Track Bus Live
              </button>
            </div>
          </div>

          {/* Floating Booking Card */}
          <div ref={heroCardRef} className="glass p-8 rounded-3xl border border-white/50 luminous-shadow relative w-full max-w-xl mx-auto">
            {heroTab === 'track' ? (
              <div className="absolute -top-4 -right-4 bg-emerald-600 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wider flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                </span>
                Live Radar
              </div>
            ) : (
              <div className="absolute -top-4 -right-4 bg-[#00affe] text-[#003f5f] px-4 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wider">
                Pre-book & Save
              </div>
            )}

            {/* Mode Switcher: Book Tickets vs Track Bus Live */}
            <div className="flex items-center gap-1.5 p-1 bg-[#f0f4f3] rounded-2xl mb-6 border border-[#e0e8e5]">
              <button
                type="button"
                onClick={() => switchHeroTab('book')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  heroTab === 'book'
                    ? 'bg-white text-[#00342b] shadow-sm'
                    : 'text-[#3f4945] hover:text-[#00342b]'
                }`}
                data-testid="hero-tab-book"
              >
                <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                Book Tickets
              </button>
              <button
                type="button"
                onClick={() => switchHeroTab('track')}
                className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  heroTab === 'track'
                    ? 'bg-white text-[#00342b] shadow-sm'
                    : 'text-[#3f4945] hover:text-[#00342b]'
                }`}
                data-testid="track-bus-live-tab"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#00E676]"></span>
                </span>
                Track Bus Live
              </button>
            </div>

            <div ref={parent} className="space-y-6">
              {heroTab === 'track' ? (
                /* Track Bus Live Panel */
                !currentUser ? (
                  <div className="p-6 bg-[#004d40]/5 border border-[#004d40]/10 rounded-2xl flex flex-col items-center text-center shadow-sm">
                    <div className="w-14 h-14 bg-white rounded-full flex items-center justify-center mb-3 shadow-sm text-[#006493]">
                      <span className="material-symbols-outlined text-3xl">near_me</span>
                    </div>
                    <h3 className="text-xl font-bold text-[#00342b] mb-1">Live Bus Radar</h3>
                    <p className="text-[#3f4945] text-sm mb-5 max-w-sm">
                      Log in to track all active buses across Silchar and Barak Valley in real time. Open tracking is available to all users with no booking needed!
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                      <Link href="/login" className="bg-[#00affe] text-white px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-[#009ae0] transition text-center w-full sm:w-auto">
                        Log In to Track
                      </Link>
                      <Link href="/login?mode=signup" className="bg-white text-[#006493] border-2 border-[#006493]/20 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition text-center w-full sm:w-auto">
                        Create Account
                      </Link>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4" data-testid="track-bus-live-panel">
                    <div className="flex items-center justify-between pb-1 border-b border-gray-100">
                      <div>
                        <h3 className="text-lg font-bold text-[#00342b] flex items-center gap-2">
                          <span className="material-symbols-outlined text-[#006493] text-[20px]">radar</span>
                          Today&apos;s Active Runs
                        </h3>
                        <p className="text-xs text-[#3f4945]">
                          Track any daily departure in real-time without needing a booking.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={refreshTodaySchedules}
                        disabled={trackLoading}
                        className="text-xs text-[#006493] hover:underline font-semibold flex items-center gap-1 px-2 py-1 rounded hover:bg-black/5 transition"
                        title="Refresh active runs"
                      >
                        <span className={`material-symbols-outlined text-[16px] ${trackLoading ? 'animate-spin' : ''}`}>
                          refresh
                        </span>
                        <span>Refresh</span>
                      </button>
                    </div>

                    {trackLoading ? (
                      <div className="p-8 flex flex-col items-center justify-center text-center">
                        <div className="w-8 h-8 border-3 border-[#006493]/20 border-t-[#006493] rounded-full animate-spin mb-3" />
                        <p className="text-xs font-bold text-[#00342b]">Fetching today&apos;s departures...</p>
                      </div>
                    ) : todaySchedules.length === 0 ? (
                      <div className="p-8 bg-[#f8fafb] rounded-2xl border border-[#e1e3e4] text-center space-y-3">
                        <span className="material-symbols-outlined text-4xl text-gray-400">directions_bus</span>
                        <h4 className="font-bold text-[#00342b] text-base">No Runs Scheduled for Today Yet</h4>
                        <p className="text-xs text-[#3f4945] max-w-sm mx-auto leading-relaxed">
                          Operators configure rolling daily departures. Please check back shortly or search upcoming dates.
                        </p>
                        <button
                          type="button"
                          onClick={() => switchHeroTab('book')}
                          className="mt-2 text-xs font-bold text-[#006493] hover:underline inline-flex items-center gap-1"
                        >
                          Search &amp; Book Upcoming Trips &rarr;
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar" data-testid="today-schedules-list">
                        {todaySchedules.map((schedule) => {
                          const origin = schedule.routes?.origin?.name || 'Silchar';
                          const dest = schedule.routes?.destination?.name || 'Sribhumi';
                          const busName = schedule.vehicles?.name || 'Transit Coach';
                          const regNo = schedule.vehicles?.registration_number;
                          const depDate = new Date(schedule.departure_time);
                          const depTimeStr = !isNaN(depDate.getTime())
                            ? depDate.toLocaleTimeString('en-IN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'Asia/Kolkata'
                              })
                            : schedule.departure_time;
                          const isLive = schedule.status === 'in_transit';
                          const isBoarding = schedule.status === 'boarding';
                          const isPaused = schedule.status === 'paused';

                          return (
                            <div
                              key={schedule.id}
                              className={`bg-white/90 border p-4 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col gap-3 ${
                                isLive
                                  ? 'border-[#00E676] ring-1 ring-[#00E676]/40'
                                  : isPaused
                                  ? 'border-rose-200 bg-rose-50/20'
                                  : 'border-gray-200'
                              }`}
                              data-testid={`schedule-card-${schedule.id}`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-[#00342b] text-base">{busName} {schedule.vehicles?.is_ac ? <span className="text-[10px] px-1 py-0.5 bg-blue-100 text-blue-800 rounded">AC</span> : <span className="text-[10px] px-1 py-0.5 bg-gray-100 text-gray-800 rounded">Non-AC</span>}</span>
                                    {regNo && (
                                      <span className="text-[10px] font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                                        {regNo}
                                      </span>
                                    )}
                                  </div>
                                  <div className="w-full mt-3 flex flex-wrap items-center gap-1.5 p-2.5 bg-gray-50 border border-gray-100 rounded-xl">
                                    {(() => {
                                      let allStops = [];
                                      if (schedule.station_times && schedule.station_times.length > 0) {
                                        allStops = schedule.station_times;
                                      } else {
                                        const stops = schedule.routes?.route_stops || [];
                                        allStops = [
                                          { name: origin, time: depTimeStr },
                                          ...stops.sort((a,b) => a.stop_order - b.stop_order).map(s => ({ name: s.location?.name || s.custom_name || 'Stop', time: '--:--' })),
                                          { name: dest, time: !isNaN(new Date(schedule.arrival_time).getTime()) ? new Date(schedule.arrival_time).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true,
                                  timeZone: 'Asia/Kolkata'
                                }) : schedule.arrival_time }
                                        ];
                                      }

                                      return allStops.map((st, idx) => (
                                        <div key={idx} className="flex items-center gap-1.5">
                                          <div className="flex flex-col items-center min-w-[40px]">
                                            <span className="text-[11px] font-bold text-[#00342b] leading-tight text-center">{st.name}</span>
                                            <span className="text-[9px] font-bold text-[#006493]">{st.time}</span>
                                          </div>
                                          {idx < allStops.length - 1 && (
                                            <span className="material-symbols-outlined text-[14px] text-[#00affe]/50 -mt-2">arrow_forward</span>
                                          )}
                                        </div>
                                      ));
                                    })()}
                                  </div>
                                </div>

                                {/* Status Badge */}
                                <div>
                                  {isLive ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-[#e8f5e9] text-[#2e7d32] border border-[#a5d6a7]">
                                      <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00E676] opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00E676]"></span>
                                      </span>
                                      LIVE
                                    </span>
                                  ) : isBoarding ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                      Boarding
                                    </span>
                                  ) : isPaused ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                      Paused
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                      Scheduled
                                    </span>
                                  )}
                                </div>
                              </div>

                              {schedule.pause_reason && (
                                <div className="text-[11px] bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px] text-amber-700 shrink-0">info</span>
                                  <span className="truncate">{schedule.pause_reason}</span>
                                </div>
                              )}



                              {/* Action Button: Route to /bookings/track/[scheduleId] */}
                              <Link
                                href={`/bookings/track/${schedule.id}`}
                                className="w-full bg-[#004d40] hover:bg-[#00382d] text-white py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-1.5 group"
                                data-testid={`track-button-${schedule.id}`}
                              >
                                <span className="material-symbols-outlined text-[16px] text-[#00affe] group-hover:scale-110 transition-transform">
                                  near_me
                                </span>
                                Track Bus Live
                                <span className="material-symbols-outlined text-[14px] group-hover:translate-x-0.5 transition-transform">
                                  arrow_forward
                                </span>
                              </Link>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )
              ) : ticketResult?.error && ticketResult.error === 'AUTH_REQUIRED' ? (
                <div className="p-6 bg-[#004d40]/5 border border-[#004d40]/10 rounded-2xl flex flex-col items-center text-center shadow-sm">
                  <span className="material-symbols-outlined text-4xl text-[#006493] mb-2">account_circle</span>
                  <h3 className="text-xl font-bold text-[#00342b] mb-2">Almost there!</h3>
                  <p className="text-[#3f4945] text-sm mb-5">You need an account to secure your booking and receive driver details.</p>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <Link href="/login" className="bg-[#00affe] text-white px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-[#009ae0] transition text-center w-full sm:w-auto">Log In</Link>
                    <Link href="/login?mode=signup" className="bg-white text-[#006493] border-2 border-[#006493]/20 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition text-center w-full sm:w-auto">Create Account</Link>
                  </div>
                </div>
              ) : ticketResult?.error ? (
                (() => {
                  const isDisrupted = ticketResult.error.includes('Service Paused') || 
                                     ticketResult.error.includes('Service Suspended') ||
                                     ticketResult.error.toLowerCase().includes('disruption') ||
                                     ticketResult.error.toLowerCase().includes('suspended') ||
                                     ticketResult.error.toLowerCase().includes('paused');

                  return (
                    <div className={`p-8 bg-gradient-to-b from-[#f4fbf9] to-white rounded-3xl flex flex-col items-center text-center border shadow-sm relative overflow-hidden ${
                      isDisrupted ? 'border-amber-300' : 'border-[#e2f1ec]'
                    }`}>
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${
                        isDisrupted ? 'bg-gradient-to-r from-amber-500 to-red-500' : 'bg-gradient-to-r from-[#00affe] to-[#006493]'
                      }`}></div>
                      <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-5 shadow-inner ${
                        isDisrupted ? 'bg-amber-100 text-amber-800' : 'bg-[#e2f1ec] text-[#006493]'
                      }`}>
                        <span className="material-symbols-outlined text-4xl">
                          {isDisrupted ? 'warning' : ticketResult.error.includes('seats') || ticketResult.error.includes('schedules') ? 'event_busy' : 'error_outline'}
                        </span>
                      </div>
                      <h3 className="text-2xl font-bold text-[#00342b] mb-3">
                        {isDisrupted ? 'Service Notice' : ticketResult.error.includes('seats') || ticketResult.error.includes('schedules') ? 'Fully Booked' : 'Search Update'}
                      </h3>
                      <p className="text-[#3f4945] text-base mb-8 px-2 sm:px-6 leading-relaxed">
                        {isDisrupted ? (
                          <>
                            <span className="font-semibold text-amber-950 block mb-2">{ticketResult.error}</span>
                            <span className="text-xs text-gray-500 block">Our operators actively monitor regional route road conditions (such as monsoon flooding or landslides). Please check back later or choose another date.</span>
                          </>
                        ) : ticketResult.error.includes('seats') ? "We couldn't find any buses with enough available seats for this route on your selected date." : 
                         ticketResult.error.includes('schedules') ? "There are no buses scheduled for this route on your selected date." : 
                         ticketResult.error}
                        {!isDisrupted && (
                          <>
                            <br />
                            <span className="text-sm mt-3 inline-block text-gray-500 font-medium">Don&apos;t worry, adjusting your date or route usually helps!</span>
                          </>
                        )}
                      </p>
                      
                      <div className="flex flex-col sm:flex-row w-full gap-3 sm:px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setTicketResult(null)
                            setSearchStep(0)
                          }}
                          className="bg-[#00affe] text-white px-6 py-3.5 rounded-xl font-bold shadow-md hover:bg-[#009ae0] hover:shadow-lg hover:-translate-y-0.5 transition-all w-full flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit_calendar</span> Modify Search
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : ticketResult?.success ? (
                <div className="p-6 bg-green-50 rounded-xl flex flex-col items-center text-center">
                  <h3 className="text-2xl font-bold text-green-800 mb-2">Booking Confirmed!</h3>
                  <p className="text-green-700 mb-4">Reference: <strong>{ticketResult.booking_reference}</strong></p>
                  <a
                    href={`https://wa.me/${(ticketResult.operator_whatsapp || '').replace(/[^0-9]/g, '')}?text=Hello,%20I%20have%20booked%20a%20ticket%20on%20Pather%20Saathi.%20My%20booking%20reference%20is%20${ticketResult.booking_reference}.`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="button-gradient text-white px-6 py-3 rounded-xl font-bold shadow-md hover:opacity-90 transition"
                  >
                    Confirm via WhatsApp
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setTicketResult(null)
                      setSearchStep(0)
                    }}
                    className="mt-4 text-sm text-[#3f4945] font-semibold hover:underline"
                  >
                    Book another ticket
                  </button>
                </div>
              ) : searchStep === 0 ? (
                <form action={handleSearch} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="pickup" className="text-sm font-semibold text-[#3f4945] ml-1">Pickup Location</label>
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#00affe] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493]">location_on</span>
                        <select id="pickup" name="pickup" required className="bg-transparent border-none p-0 focus:ring-0 text-base w-full text-[#00342b] font-semibold appearance-none outline-none">
                          <option value="">Select Pickup</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="destination" className="text-sm font-semibold text-[#3f4945] ml-1">Destination</label>
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#00affe] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493]">near_me</span>
                        <select id="destination" name="destination" required className="bg-transparent border-none p-0 focus:ring-0 text-base w-full text-[#00342b] font-semibold appearance-none outline-none">
                          <option value="">Select Destination</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="travelDate" className="text-sm font-semibold text-[#3f4945] ml-1">Travel Date</label>
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#00affe] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493]">calendar_today</span>
                        <input id="travelDate" type="date" name="travelDate" defaultValue={getTodayString()} required min={new Date().toISOString().split('T')[0]} className="bg-transparent border-none p-0 focus:ring-0 text-base w-full text-[#00342b] font-semibold outline-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="seats" className="text-sm font-semibold text-[#3f4945] ml-1">Passengers</label>
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl px-4 py-3 focus-within:ring-2 focus-within:ring-[#00affe] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493]">group</span>
                        <select id="seats" name="seats" required className="bg-transparent border-none p-0 focus:ring-0 text-base w-full text-[#00342b] font-semibold appearance-none outline-none">
                          <option value="">Select Seats</option>
                          {Array.from({ length: 20 }, (_, i) => (
                            <option key={i + 1} value={i + 1}>{i + 1} Passenger{i > 0 ? 's' : ''}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={searchLoading}
                    className="group w-full button-gradient text-white py-4 rounded-xl font-semibold text-base shadow-xl hover:shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {searchLoading ? (
                      <span className="flex items-center gap-2"><span className="animate-spin material-symbols-outlined">progress_activity</span> Searching...</span>
                    ) : (
                      <>Search Buses <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span></>
                    )}
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-bold text-[#00342b]">Available Buses</h3>
                    <button 
                      onClick={() => setSearchStep(0)} 
                      className="text-sm text-[#006493] hover:underline font-semibold flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span> Modify Search
                    </button>
                  </div>
                  
                  <div className="flex flex-col gap-3 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
                    {availableSchedules.map((schedule) => {
                      const depTime = new Date(schedule.departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      const arrTime = new Date(schedule.arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      const busName = schedule.vehicles?.name || 'Bus'
                      
                      return (
                        <div key={schedule.id} className="bg-white/80 border border-white p-4 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div>
                            <h4 className="font-bold text-[#00342b] text-lg flex items-center gap-2">{busName} {schedule.vehicles?.is_ac ? <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded">AC</span> : <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-800 rounded">Non-AC</span>}</h4>
                            <div className="flex items-center gap-2 text-sm text-[#3f4945] mt-1">
                              <span className="font-semibold text-[#006493]">{depTime}</span>
                              <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                              <span className="font-semibold text-[#006493]">{arrTime}</span>
                            </div>
                            <div className="mt-2 text-xs font-semibold px-2 py-0.5 bg-green-50 text-green-700 rounded-md inline-block">
                              {schedule.available_seats} Seats Available
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end gap-2">
                            <div className="text-xl font-bold text-[#00342b]">₹{(schedule.base_fare || 0) * parseInt(searchParams.seats || "1")}</div>
                            <form action={handleTicketBooking}>
                              <input type="hidden" name="scheduleId" value={schedule.id} />
                              <input type="hidden" name="seats" value={searchParams.seats} />
                              <input type="hidden" name="travelDate" value={searchParams.travelDate} />
                              <button
                                type="submit"
                                disabled={ticketLoading}
                                className="bg-[#00affe] text-white px-5 py-2 rounded-xl font-bold text-sm shadow-md hover:bg-[#009ae0] hover:-translate-y-0.5 transition-all disabled:opacity-50 flex items-center justify-center min-w-[120px]"
                              >
                                {ticketLoading ? <span className="animate-spin material-symbols-outlined text-[18px]">progress_activity</span> : 'Select & Book'}
                              </button>
                            </form>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Book Whole Bus Section */}
      <section ref={busesRef} className="py-20 px-5 lg:px-10 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
          <div className="space-y-2">
            <span className="text-[#006493] font-bold tracking-widest text-xs uppercase">Exclusive Buses</span>
            <h2 className="text-3xl font-bold text-[#00342b]">Book a Whole Bus</h2>
            <p className="text-[#3f4945] text-sm md:text-base max-w-xl">Need a bus for a wedding, picnic, or event? Book an entire bus for your group easily.</p>
          </div>
        </div>

        <form action={handleWholeVehicleBooking}>
          {/* Form Actions for whole booking */}
          <div className="bg-white rounded-[16px] shadow-sm p-6 mb-10 grid grid-cols-1 md:grid-cols-2 gap-5 border border-black/5 luminous-shadow relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 col-span-1 md:col-span-2">
              <div className="space-y-2">
                <label htmlFor="travelDate" className="text-sm font-semibold text-[#3f4945] ml-1">Travel Date</label>
                <input
                  id="travelDate"
                  type="date"
                  name="travelDate"
                  defaultValue={getTodayString()}
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-[#bfc9c4] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe] bg-[#f8fafb]"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="occasion" className="text-sm font-semibold text-[#3f4945] ml-1">Occasion</label>
                <select
                  id="occasion"
                  name={selectedOccasion === 'Others' ? 'occasion_dropdown' : 'occasion'}
                  value={selectedOccasion}
                  onChange={(e) => setSelectedOccasion(e.target.value)}
                  required
                  className="w-full border border-[#bfc9c4] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe] bg-[#f8fafb] appearance-none"
                >
                  <option value="" disabled>Select an occasion</option>
                  <option value="Wedding">Wedding</option>
                  <option value="Reception">Reception</option>
                  <option value="Picnic">Picnic</option>
                  <option value="Others">Others (Please specify)</option>
                </select>
              </div>
              
              {selectedOccasion === 'Others' && (
                <div className="space-y-2 col-span-1 md:col-span-2">
                  <label htmlFor="customOccasion" className="text-sm font-semibold text-[#3f4945] ml-1">Specify Occasion</label>
                  <input
                    id="customOccasion"
                    type="text"
                    name="occasion"
                    placeholder="E.g., Corporate Event, Pilgrimage..."
                    maxLength={100}
                    required
                    className="w-full border border-[#bfc9c4] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe] bg-[#f8fafb]"
                  />
                </div>
              )}
            </div>

            {busResult?.error && busResult.error === 'AUTH_REQUIRED' ? (
              <div className="col-span-1 md:col-span-2 p-6 bg-[#004d40]/5 border border-[#004d40]/10 rounded-2xl flex flex-col items-center text-center shadow-sm">
                <span className="material-symbols-outlined text-4xl text-[#006493] mb-2">account_circle</span>
                <h3 className="text-xl font-bold text-[#00342b] mb-2">Almost there!</h3>
                <p className="text-[#3f4945] text-sm mb-5">You need an account to submit charter requests and coordinate with operators.</p>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <Link href="/login" className="bg-[#00affe] text-white px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-[#009ae0] transition text-center w-full sm:w-auto">Log In</Link>
                  <Link href="/login?mode=signup" className="bg-white text-[#006493] border-2 border-[#006493]/20 px-6 py-2.5 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition text-center w-full sm:w-auto">Create Account</Link>
                </div>
              </div>
            ) : busResult?.error ? (
              <div className="col-span-1 md:col-span-2 p-4 bg-red-50 text-red-700 rounded-xl font-medium">
                {busResult.error}
              </div>
            ) : null}

            {busResult?.success && (
              <div className="col-span-1 md:col-span-2 p-6 bg-green-50 rounded-xl flex flex-col items-center">
                <h3 className="text-2xl font-bold text-green-800 mb-2">Charter Request Submitted!</h3>
                <p className="text-green-700 mb-1">Reference: <strong>{busResult.booking_reference}</strong></p>
                <p className="text-green-600 text-sm mb-4 text-center">Vehicles: {busResult.vehicle_names}</p>
                <a
                  href={`https://wa.me/${(busResult.operator_whatsapp || '').replace(/[^0-9]/g, '')}?text=Hello,%20I%20have%20submitted%20a%20whole%20bus%20booking%20on%20Pather%20Saathi.%20Reference:%20${busResult.booking_reference}.%20Vehicles:%20${encodeURIComponent(busResult.vehicle_names || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button-gradient text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition shadow-md"
                >
                  Confirm via WhatsApp
                </a>
              </div>
            )}

            {/* Removed Static Inline Button as requested */}

            {/* Smooth Sliding Floating Bar */}
            <div className={`fixed bottom-0 left-0 w-full bg-white shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.15)] border-t border-gray-100 p-4 md:p-6 z-[100] flex justify-between items-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${selectedBuses.length > 0 ? 'translate-y-0' : 'translate-y-full'}`}>
              <div className="max-w-7xl mx-auto w-full flex justify-between items-center">
                <p className="text-sm md:text-base font-semibold text-[#3f4945]">
                  {selectedBuses.length} bus{selectedBuses.length > 1 ? 'es' : ''} selected
                </p>
                <button
                  type="submit"
                  disabled={busLoading || selectedBuses.length === 0}
                  className="button-gradient text-white px-6 py-3 md:px-10 md:py-4 rounded-xl font-bold hover:opacity-90 transition shadow-xl flex items-center justify-center gap-2 text-sm md:text-base hover:scale-105 active:scale-95"
                >
                  {busLoading ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                      Booking...
                    </>
                  ) : (
                    'Request Charter'
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-32">
            {sortedVehicles.map((bus) => {
              const selected = selectedBuses.includes(bus.id);
              return (
                <div 
                  key={bus.id} 
                  onClick={() => toggleBusSelection(bus.id)}
                  className={`bg-white rounded-[16px] overflow-hidden border ${selected ? 'border-[#00affe] ring-2 ring-[#00affe]' : 'border-[#bfc9c4]/50'} luminous-shadow group hover:-translate-y-2 transition-all duration-300 relative cursor-pointer`}
                >
                  <div className="relative h-56 overflow-hidden bg-gray-50 flex items-center justify-center">
                    {bus.image_url ? (
                      <Image
                        src={bus.image_url}
                        alt={bus.name}
                        width={600}
                        height={400}
                        className="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <span className="material-symbols-outlined text-6xl text-gray-300">directions_bus</span>
                    )}
                    <div className="absolute top-4 left-4 bg-[#004d40]/90 text-white px-3 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase shadow-sm">
                      Premium
                    </div>
                  </div>

                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-xl font-bold text-[#00342b]">{bus.name}</h3>
                        <p className="text-[#3f4945] text-xs font-medium mt-1">{bus.registration_number}</p>
                      </div>
                      <div className="bg-[#f2f4f5] px-3 py-1 rounded-lg text-center leading-tight">
                        <span className="text-[#006493] font-bold block text-lg">{bus.capacity_seats}</span>
                        <span className="text-[#3f4945] text-[9px] font-bold tracking-wider">SEATS</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {bus.features?.split(',').map((feat, i) => (
                        <span key={i} className="font-semibold text-[#3f4945] bg-[#e1e3e4]/50 px-2 py-1 rounded-md">
                          {feat.trim()}
                        </span>
                      ))}
                    </div>

                    <button
                      type="button"
                      className={`w-full py-3 rounded-xl font-semibold transition-all pointer-events-none ${selected
                        ? 'bg-[#00affe] text-white shadow-md'
                        : 'border-2 border-[#004d40]/10 text-[#00342b] hover:bg-[#004d40] hover:text-white'
                        }`}
                    >
                      {selected ? 'Selected ✓' : 'Select Bus'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      </section>

      {/* Stats / Why Us Bento Grid */}
      <section className="py-20 bg-[#eceeef]">
        <div className="container mx-auto px-5 lg:px-10 max-w-7xl">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-2 glass p-8 rounded-3xl border border-white/40 flex flex-col justify-between min-h-[200px] hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-default">
              <span className="material-symbols-outlined text-4xl text-[#006493]">security</span>
              <div className="mt-6">
                <h4 className="text-xl font-bold text-[#00342b]">Uncompromised Safety</h4>
                <p className="text-[#3f4945] text-sm mt-2">24/7 support and verified drivers to ensure your journey is always safe.</p>
              </div>
            </div>
            <div className="md:col-span-1 bg-white p-8 rounded-3xl flex flex-col items-center justify-center text-center border border-black/5 luminous-shadow hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-default">
              <span className="text-4xl lg:text-5xl font-bold text-gradient">98%</span>
              <p className="text-[#3f4945] text-sm font-bold mt-2">On-Time Arrival</p>
            </div>
            <div className="md:col-span-1 bg-white p-8 rounded-3xl flex flex-col items-center justify-center text-center border border-black/5 luminous-shadow hover:-translate-y-1 hover:shadow-xl transition-all duration-300 cursor-default">
              <span className="text-4xl lg:text-5xl font-bold text-gradient">15k+</span>
              <p className="text-[#3f4945] text-sm font-bold mt-2">Monthly Travelers</p>
            </div>
            <div className="md:col-span-4 lg:col-span-4 primary-gradient p-8 md:p-12 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
              <div className="z-10 text-center md:text-left">
                <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider backdrop-blur-md border border-white/30">Coming Soon</div>
                <h4 className="text-2xl font-bold">The Pather Saathi App</h4>
                <p className="text-[#e0f2f1] text-sm md:text-base mt-2 max-w-md">Book tickets and manage your trips seamlessly from your phone.</p>
              </div>
              <div className="z-10 flex flex-col sm:flex-row gap-4 w-full md:w-auto mt-4 md:mt-0">
                <div className="bg-[#00342b]/50 text-white/60 border border-white/20 px-5 py-3 rounded-xl flex items-center justify-center sm:justify-start gap-3 cursor-not-allowed transition w-full sm:w-auto">
                  <svg className="w-8 h-8 opacity-70 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 0 1-.61-.92V2.734a1 1 0 0 1 .609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 2.302-2.624-2.302 2.624-2.302zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z" /></svg>
                  <div className="text-xs leading-tight text-left">COMING TO <br /><span className="text-base font-bold whitespace-nowrap">Google Play</span></div>
                </div>
                <div className="bg-[#00342b]/50 text-white/60 border border-white/20 px-5 py-3 rounded-xl flex items-center justify-center sm:justify-start gap-3 cursor-not-allowed transition w-full sm:w-auto">
                  <span className="material-symbols-outlined text-3xl opacity-70 shrink-0">phone_iphone</span>
                  <div className="text-xs leading-tight text-left">COMING TO <br /><span className="text-base font-bold whitespace-nowrap">App Store</span></div>
                </div>
              </div>
              <span className="material-symbols-outlined absolute -right-10 -bottom-20 text-[250px] text-white/10 hidden lg:block pointer-events-none">smartphone</span>
            </div>
          </div>
        </div>
      </section>

      {/* AI SEO FAQ Section */}
      <section className="py-16 bg-white border-t border-[#bfc9c4]/30">
        <div className="container mx-auto px-5 lg:px-10 max-w-4xl">
          <h2 className="text-3xl font-bold text-[#00342b] mb-10 text-center">Frequently Asked Questions</h2>
          <div className="space-y-8">
            <div className="p-6 md:p-8 bg-[#f8fafb] rounded-3xl border border-[#e1e3e4] hover:shadow-md transition-shadow">
              <h3 className="text-lg md:text-xl font-bold text-[#00342b] mb-3 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#00affe] mt-0.5 shrink-0">help</span>
                What is Pather Saathi?
              </h3>
              <p className="text-[#3f4945] leading-relaxed ml-0 md:ml-9">
                Pather Saathi is the premier ultra-local fleet booking platform connecting the regions of Sribhumi, Silchar, and Hailakandi in Barak Valley, Assam. We provide secure online seat booking and whole vehicle chartering with verified operators to ensure safe and reliable journeys.
              </p>
            </div>
            <div className="p-6 md:p-8 bg-[#f8fafb] rounded-3xl border border-[#e1e3e4] hover:shadow-md transition-shadow">
              <h3 className="text-lg md:text-xl font-bold text-[#00342b] mb-3 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#00affe] mt-0.5 shrink-0">help</span>
                How do I book a bus in Barak Valley?
              </h3>
              <p className="text-[#3f4945] leading-relaxed ml-0 md:ml-9">
                To book a bus in Barak Valley through Pather Saathi, simply create a free account, select your pickup and destination locations, choose your travel date, and confirm your seat. Your booking will be instantly sent to the operator for final confirmation.
              </p>
            </div>
            <div className="p-6 md:p-8 bg-[#f8fafb] rounded-3xl border border-[#e1e3e4] hover:shadow-md transition-shadow">
              <h3 className="text-lg md:text-xl font-bold text-[#00342b] mb-3 flex items-start gap-3">
                <span className="material-symbols-outlined text-[#00affe] mt-0.5 shrink-0">help</span>
                Can I charter a whole vehicle in Silchar or Sribhumi?
              </h3>
              <p className="text-[#3f4945] leading-relaxed ml-0 md:ml-9">
                Yes, Pather Saathi allows you to easily request whole vehicle charters in Silchar, Sribhumi, and Hailakandi. Navigate to the Charter section on our homepage, select your travel dates, and submit a request to our verified local fleet operators.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
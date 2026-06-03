"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Database } from '@/types/database.types';
import { createTicketBooking, createWholeVehicleBooking } from "./actions";

type Location = Database['public']['Tables']['locations']['Row'];
type Vehicle = Database['public']['Tables']['vehicles']['Row'];

interface HomeClientProps {
  locations: Location[];
  vehicles: Vehicle[];
}

type BookingResult = {
  success: boolean;
  error?: string;
  booking_reference?: string;
  operator_whatsapp?: string;
  vehicle_names?: string;
  message?: string;
};

export default function HomeClient({ locations, vehicles }: HomeClientProps) {
  const [selectedBuses, setSelectedBuses] = useState<string[]>([]);
  
  const [ticketLoading, setTicketLoading] = useState(false);
  const [ticketResult, setTicketResult] = useState<BookingResult | null>(null);

  const [busLoading, setBusLoading] = useState(false);
  const [busResult, setBusResult] = useState<BookingResult | null>(null);

  const busesRef = useRef<HTMLElement | null>(null);

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
    } catch {
      setBusResult({ success: false, error: 'An unexpected error occurred.' });
    }
    setBusLoading(false);
  };

  return (
    <main className="pt-0 pb-24 font-sans text-[#191c1d]">
      {/* Hero Section with Map Gradient */}
      <section className="relative min-h-[650px] flex items-center justify-center overflow-hidden pt-16">
        {/* Dynamic Gradient Background */}
        <div className="absolute inset-0 primary-gradient opacity-10"></div>
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, #00affe 0%, transparent 50%), radial-gradient(circle at 80% 80%, #004d40 0%, transparent 50%)" }}></div>
        
        <div className="container mx-auto px-5 lg:px-10 z-10 grid lg:grid-cols-2 gap-12 items-center relative">
          <div className="space-y-6 pt-10 lg:pt-0 text-center lg:text-left">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight text-[#00342b] tracking-tight">
              Your Trusted <span className="text-[#006493]">Bus Booking</span> Platform.
            </h1>
            <p className="text-lg text-[#3f4945] max-w-lg mx-auto lg:mx-0">
              Easy and reliable bus ticket booking across Silchar and Barak Valley. Safe, comfortable journeys every time.
            </p>
            <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/40 shadow-sm">
                <span className="material-symbols-outlined text-[#006493]">verified_user</span>
                <span className="text-sm font-semibold text-[#00342b]">Verified Buses</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass border border-white/40 shadow-sm">
                <span className="material-symbols-outlined text-[#006493]">task_alt</span>
                <span className="text-sm font-semibold text-[#00342b]">Instant Booking</span>
              </div>
            </div>
            <button
              type="button"
              onClick={scrollToBuses}
              className="mt-6 px-8 py-3 rounded-full border border-[#006493] text-[#006493] font-semibold hover:bg-[#006493]/5 transition-colors"
            >
              Book a Whole Bus
            </button>
          </div>

          {/* Floating Booking Card */}
          <div className="glass p-8 rounded-3xl border border-white/50 luminous-shadow relative w-full max-w-xl mx-auto">
            <div className="absolute -top-4 -right-4 bg-[#00affe] text-[#003f5f] px-4 py-1 rounded-full text-xs font-bold shadow-lg uppercase tracking-wider">
              Pre-book & Save
            </div>
            
            <form action={handleTicketBooking} className="space-y-6">
              {ticketResult?.error && (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl font-medium">
                  {ticketResult.error}
                </div>
              )}
              
              {ticketResult?.success ? (
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
                    onClick={() => setTicketResult(null)}
                    className="mt-4 text-sm text-[#3f4945] font-semibold hover:underline"
                  >
                    Book another ticket
                  </button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="pickup" className="text-sm font-semibold text-[#3f4945] ml-1">Pickup Location</label>
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl p-2 focus-within:border-[#006493] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493] ml-2">location_on</span>
                        <select id="pickup" name="pickup" required className="bg-transparent border-none p-2 focus:ring-0 text-sm w-full text-[#00342b] font-semibold appearance-none outline-none">
                          <option value="">Select Pickup</option>
                          {locations.map(loc => (
                            <option key={loc.id} value={loc.id}>{loc.name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="destination" className="text-sm font-semibold text-[#3f4945] ml-1">Destination</label>
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl p-2 focus-within:border-[#006493] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493] ml-2">near_me</span>
                        <select id="destination" name="destination" required className="bg-transparent border-none p-2 focus:ring-0 text-sm w-full text-[#00342b] font-semibold appearance-none outline-none">
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
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl p-2 focus-within:border-[#006493] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493] ml-2">calendar_today</span>
                        <input id="travelDate" type="date" name="travelDate" required min={new Date().toISOString().split('T')[0]} className="bg-transparent border-none p-2 focus:ring-0 text-sm w-full text-[#00342b] font-semibold outline-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="seats" className="text-sm font-semibold text-[#3f4945] ml-1">Passengers</label>
                      <div className="flex items-center gap-3 bg-white border border-[#bfc9c4] rounded-xl p-2 focus-within:border-[#006493] transition-all overflow-hidden">
                        <span className="material-symbols-outlined text-[#006493] ml-2">group</span>
                        <select id="seats" name="seats" required className="bg-transparent border-none p-2 focus:ring-0 text-sm w-full text-[#00342b] font-semibold appearance-none outline-none">
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
                    disabled={ticketLoading}
                    className="w-full button-gradient text-white py-4 rounded-xl font-semibold text-base shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    {ticketLoading ? (
                      <>
                        <span className="material-symbols-outlined animate-spin text-base">progress_activity</span>
                        Searching...
                      </>
                    ) : (
                      <>
                        <span>Search Journeys</span>
                        <span className="material-symbols-outlined">arrow_forward</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
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
                <label htmlFor="startDate" className="text-sm font-semibold text-[#3f4945] ml-1">Start Date</label>
                <input
                  id="startDate"
                  type="date"
                  name="startDate"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-[#bfc9c4] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe] bg-[#f8fafb]"
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="endDate" className="text-sm font-semibold text-[#3f4945] ml-1">End Date</label>
                <input
                  id="endDate"
                  type="date"
                  name="endDate"
                  required
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full border border-[#bfc9c4] rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#00affe] bg-[#f8fafb]"
                />
              </div>
            </div>

            {busResult?.error && (
              <div className="col-span-1 md:col-span-2 p-4 bg-red-50 text-red-700 rounded-xl font-medium">
                {busResult.error}
              </div>
            )}

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

            <div className="col-span-1 md:col-span-2 flex justify-between items-center pt-4 border-t border-black/5 mt-2">
              <p className="text-sm font-semibold text-[#3f4945]">
                {selectedBuses.length === 0 ? 'No buses selected' : `${selectedBuses.length} bus${selectedBuses.length > 1 ? 'es' : ''} selected`}
              </p>
              <button
                type="submit"
                disabled={busLoading || selectedBuses.length === 0}
                className="button-gradient text-white px-8 py-3 rounded-xl font-semibold hover:opacity-90 transition disabled:opacity-40 shadow-md flex items-center justify-center gap-2"
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

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {vehicles.map((bus) => {
              const selected = selectedBuses.includes(bus.id);
              return (
                <div key={bus.id} className={`bg-white rounded-[16px] overflow-hidden border ${selected ? 'border-[#00affe] ring-2 ring-[#00affe]' : 'border-[#bfc9c4]/50'} luminous-shadow group hover:-translate-y-2 transition-all duration-300 relative`}>
                  <div className="relative h-56 overflow-hidden bg-gray-50 flex items-center justify-center">
                    {bus.image_url ? (
                      <Image 
                        src={bus.image_url} 
                        alt={bus.name} 
                        width={600} 
                        height={400} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        unoptimized
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
                      onClick={() => toggleBusSelection(bus.id)}
                      className={`w-full py-3 rounded-xl font-semibold transition-all ${
                        selected 
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
            <div className="md:col-span-2 glass p-8 rounded-3xl border border-white/40 flex flex-col justify-between min-h-[200px]">
              <span className="material-symbols-outlined text-4xl text-[#006493]">security</span>
              <div className="mt-6">
                <h4 className="text-xl font-bold text-[#00342b]">Uncompromised Safety</h4>
                <p className="text-[#3f4945] text-sm mt-2">24/7 support and verified drivers to ensure your journey is always safe.</p>
              </div>
            </div>
            <div className="md:col-span-1 bg-white p-8 rounded-3xl flex flex-col items-center justify-center text-center border border-black/5 luminous-shadow">
              <span className="text-4xl lg:text-5xl font-bold text-gradient">98%</span>
              <p className="text-[#3f4945] text-sm font-bold mt-2">On-Time Arrival</p>
            </div>
            <div className="md:col-span-1 bg-white p-8 rounded-3xl flex flex-col items-center justify-center text-center border border-black/5 luminous-shadow">
              <span className="text-4xl lg:text-5xl font-bold text-gradient">15k+</span>
              <p className="text-[#3f4945] text-sm font-bold mt-2">Monthly Travelers</p>
            </div>
            <div className="md:col-span-4 lg:col-span-4 primary-gradient p-8 md:p-12 rounded-3xl text-white flex flex-col md:flex-row justify-between items-center gap-8 relative overflow-hidden">
              <div className="z-10 text-center md:text-left">
                <div className="inline-block bg-white/20 text-white text-xs font-bold px-3 py-1 rounded-full mb-3 uppercase tracking-wider backdrop-blur-md border border-white/30">Coming Soon</div>
                <h4 className="text-2xl font-bold">The Pather Saathi App</h4>
                <p className="text-[#e0f2f1] text-sm md:text-base mt-2 max-w-md">Book tickets and manage your trips seamlessly from your phone.</p>
              </div>
              <div className="z-10 flex flex-col sm:flex-row gap-4">
                <div className="bg-[#00342b]/50 text-white/60 border border-white/20 px-5 py-3 rounded-xl flex items-center gap-3 cursor-not-allowed transition">
                  <span className="material-symbols-outlined text-3xl opacity-70">play_store_installed</span>
                  <div className="text-xs leading-tight text-left">COMING TO <br/><span className="text-base font-bold">Google Play</span></div>
                </div>
                <div className="bg-[#00342b]/50 text-white/60 border border-white/20 px-5 py-3 rounded-xl flex items-center gap-3 cursor-not-allowed transition">
                  <span className="material-symbols-outlined text-3xl opacity-70">phone_iphone</span>
                  <div className="text-xs leading-tight text-left">COMING TO <br/><span className="text-base font-bold">App Store</span></div>
                </div>
              </div>
              <span className="material-symbols-outlined absolute -right-10 -bottom-20 text-[250px] text-white/10 hidden lg:block">smartphone</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white text-[#191c1d] px-5 lg:px-10 py-12 md:py-16 border-t border-[#d8dadb]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-center md:text-left gap-10">
          <div className="flex flex-col items-center md:items-start">
            <h2 className="text-2xl font-bold mb-4 text-[#00342b]">Contact Us</h2>
            <div className="space-y-3 text-[#3f4945] text-sm font-medium">
              <p className="flex items-center justify-center md:justify-start gap-2"><span className="material-symbols-outlined text-[#006493]">mail</span> pathersaathi@gmail.com</p>
              <p className="flex items-center justify-center md:justify-start gap-2"><span className="material-symbols-outlined text-[#006493]">call</span> +91 6002089037</p>
              <p className="flex items-center justify-center md:justify-start gap-2"><span className="material-symbols-outlined text-[#006493]">location_on</span> Silchar, Barak Valley, Assam</p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center">
            <div className="bg-white p-1 rounded-full shadow-md mb-4 border border-[#e1e3e4]">
              <Image src="/images/logo.jpeg" alt="Pather Saathi" width={80} height={80} className="rounded-full object-cover w-20 h-20" unoptimized />
            </div>
            <h3 className="text-xl font-bold text-[#00342b] tracking-tight">Pather Saathi</h3>
            <p className="text-[#006493] text-xs font-bold mt-1 uppercase tracking-widest">Barak Valley&apos;s Journey Partner</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
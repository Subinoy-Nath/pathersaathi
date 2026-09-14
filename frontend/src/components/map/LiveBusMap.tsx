'use client'

import dynamic from 'next/dynamic'
import React from 'react'
import type { LeafletMapInnerProps } from './LeafletMapInner'

// Dynamically import Leaflet with SSR completely disabled to prevent window/document undefined crashes
const DynamicLeafletMap = dynamic(
  () => import('./LeafletMapInner'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[450px] sm:h-[500px] bg-[#001712] rounded-2xl flex flex-col items-center justify-center text-white/80 p-6 text-center border border-[#00E676]/20">
        <div className="w-12 h-12 border-3 border-[#00E676]/20 border-t-[#00E676] rounded-full animate-spin mb-4" />
        <p className="font-bold text-base text-[#00E676]">
          মানচিত্র লোড হচ্ছে... / Loading Live Bus Route
        </p>
        <p className="text-xs text-white/60 mt-1">
          Barak Valley Regional Transit Satellite GPS
        </p>
      </div>
    )
  }
)

export default function LiveBusMap(props: LeafletMapInnerProps) {
  return (
    <div className="w-full overflow-hidden rounded-2xl border border-[#004d40]/30 shadow-2xl bg-[#001712]">
      <DynamicLeafletMap {...props} />
    </div>
  )
}

import React from 'react'

export const metadata = {
  title: 'Pather Saathi • Driver Cabin | চালক কেবিন',
  description: 'Barak Valley Regional Transit Driver Telemetry & Navigation HUD',
}

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#001712] text-white flex flex-col font-sans selection:bg-[#00E676] selection:text-black antialiased">
      {children}
    </div>
  )
}

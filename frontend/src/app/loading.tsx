export default function Loading() {
  return (
    <div className="min-h-[70vh] flex flex-col justify-center items-center">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-[#e2f1ec] rounded-full"></div>
        <div className="absolute inset-0 border-4 border-[#00affe] border-t-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="material-symbols-outlined text-[#006493] text-2xl animate-pulse">directions_bus</span>
        </div>
      </div>
      <p className="mt-4 text-[#00342b] font-medium tracking-wide animate-pulse">Loading...</p>
    </div>
  )
}

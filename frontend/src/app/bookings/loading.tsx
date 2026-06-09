export default function BookingsLoading() {
  return (
    <div className="min-h-[70vh] py-10 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="max-w-4xl mx-auto">
        <div className="h-10 w-48 bg-[#e6e8e9] rounded-lg mb-8"></div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="glass p-6 rounded-3xl border border-white/50 luminous-shadow relative w-full overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#e6e8e9] to-[#bfc9c4]"></div>
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="h-3 w-32 bg-[#e6e8e9] rounded mb-2"></div>
                  <div className="h-6 w-40 bg-[#bfc9c4] rounded"></div>
                </div>
                <div className="h-6 w-24 bg-[#00affe]/20 rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-t border-b border-[#e6e8e9]">
                {[1, 2, 3, 4].map(j => (
                  <div key={j}>
                    <div className="h-3 w-16 bg-[#e6e8e9] rounded mb-2"></div>
                    <div className="h-5 w-24 bg-[#bfc9c4] rounded"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function OperatorLoading() {
  return (
    <div className="bg-[#f8fafb] min-h-screen pt-20">
      <div className="flex min-h-[calc(100vh-80px)]">
        <main className="flex-1 p-8 lg:p-12 overflow-y-auto">
          
          <div className="flex justify-between items-end mb-8">
            <div className="space-y-3">
              <div className="h-10 w-64 bg-[#e6e8e9] rounded-xl animate-pulse"></div>
              <div className="h-5 w-48 bg-[#e6e8e9] rounded-md animate-pulse"></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {[1, 2, 3].map((i) => (
              <div key={i} className="glass-card p-5 rounded-xl border border-white/40 h-64 flex flex-col gap-4">
                <div className="w-full h-32 rounded-lg bg-[#e6e8e9] animate-pulse"></div>
                <div className="h-6 w-3/4 bg-[#e6e8e9] rounded-md animate-pulse"></div>
                <div className="h-4 w-1/2 bg-[#e6e8e9] rounded-md animate-pulse mt-auto"></div>
              </div>
            ))}
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-8 w-40 bg-[#e6e8e9] rounded-md animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-8 w-24 bg-[#e6e8e9] rounded-lg animate-pulse"></div>
                <div className="h-8 w-24 bg-[#e6e8e9] rounded-lg animate-pulse"></div>
              </div>
            </div>

            <div className="glass-card rounded-2xl border border-white/40 overflow-hidden shadow-xl">
              <div className="w-full h-12 bg-[#e6e8e9] animate-pulse border-b border-white"></div>
              <div className="divide-y divide-[#bfc9c4]/20">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 flex justify-between items-center h-20">
                    <div className="h-4 w-1/5 bg-[#e6e8e9] rounded animate-pulse"></div>
                    <div className="h-4 w-1/5 bg-[#e6e8e9] rounded animate-pulse"></div>
                    <div className="h-4 w-1/5 bg-[#e6e8e9] rounded animate-pulse"></div>
                    <div className="h-8 w-24 bg-[#e6e8e9] rounded animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  )
}

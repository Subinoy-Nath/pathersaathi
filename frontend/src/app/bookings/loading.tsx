export default function BookingsLoading() {
  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8 animate-pulse">
      <div className="max-w-4xl mx-auto">
        <div className="h-10 w-48 bg-gray-200 rounded-lg mb-8"></div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <div className="h-3 w-32 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 w-40 bg-gray-200 rounded"></div>
                </div>
                <div className="h-6 w-20 bg-gray-200 rounded-full"></div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6 py-4 border-t border-b border-gray-100">
                {[1, 2, 3, 4].map(j => (
                  <div key={j}>
                    <div className="h-3 w-16 bg-gray-200 rounded mb-2"></div>
                    <div className="h-5 w-24 bg-gray-200 rounded"></div>
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

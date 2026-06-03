export default function OperatorLoading() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 animate-pulse">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="h-10 w-64 bg-gray-200 rounded-lg mb-2"></div>
            <div className="h-6 w-48 bg-gray-200 rounded-lg"></div>
          </div>
          <div className="flex gap-3">
            <div className="h-12 w-32 bg-gray-200 rounded-xl"></div>
            <div className="h-12 w-32 bg-gray-200 rounded-xl"></div>
          </div>
        </header>

        <main className="space-y-10">
          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="flex justify-between items-center mb-6">
              <div className="h-8 w-40 bg-gray-200 rounded-lg"></div>
              <div className="h-6 w-24 bg-gray-200 rounded-full"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="border border-gray-100 rounded-2xl p-6 bg-gray-50">
                  <div className="h-6 w-3/4 bg-gray-200 rounded-lg mb-2"></div>
                  <div className="h-4 w-1/2 bg-gray-200 rounded-lg mb-4"></div>
                  <div className="flex justify-between">
                    <div className="h-4 w-16 bg-gray-200 rounded-lg"></div>
                    <div className="h-4 w-20 bg-gray-200 rounded-lg"></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
            <div className="h-8 w-48 bg-gray-200 rounded-lg mb-6"></div>
            <div className="space-y-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-16 w-full bg-gray-100 rounded-xl"></div>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  )
}

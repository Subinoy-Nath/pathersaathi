'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function OperatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen bg-gray-50 p-6 md:p-10 flex flex-col justify-center items-center">
      <div className="max-w-md w-full bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Error</h2>
        <p className="text-gray-500 mb-8">Failed to load the operator dashboard. This might be a temporary issue.</p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full bg-purple-600 text-white font-semibold py-3 px-4 rounded-xl hover:bg-purple-700 transition"
          >
            Retry Loading
          </button>
          <Link
            href="/"
            className="w-full bg-gray-100 text-gray-700 font-semibold py-3 px-4 rounded-xl hover:bg-gray-200 transition"
          >
            Return Home
          </Link>
        </div>
      </div>
    </div>
  )
}

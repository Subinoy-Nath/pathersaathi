'use client'

import { useTransition } from 'react'
import { clearFrontendHistory } from '@/app/operator/actions'
import { toast } from 'sonner'

export default function ClearHistoryButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => { 
        const result = await clearFrontendHistory()
        if (result.success) {
          toast.success('History cleared successfully')
        } else {
          toast.error('Failed to clear history')
        }
      })}
      disabled={isPending}
      className="bg-[#ffebee] text-red-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-1 group"
      title="Hide rejected and cancelled bookings from this view"
    >
      <span className="material-symbols-outlined text-[16px] group-hover:scale-110 transition-transform">clear_all</span>
      {isPending ? 'Clearing...' : 'Clear History'}
    </button>
  )
}


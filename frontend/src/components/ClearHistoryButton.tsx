'use client'

import { useTransition } from 'react'
import { clearFrontendHistory } from '@/app/operator/actions'

export default function ClearHistoryButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => startTransition(async () => { await clearFrontendHistory() })}
      disabled={isPending}
      className="bg-[#ffebee] text-red-600 px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors disabled:opacity-50 flex items-center gap-1"
    >
      <span className="material-symbols-outlined text-[16px]">clear_all</span>
      {isPending ? 'Clearing...' : 'Clear History'}
    </button>
  )
}

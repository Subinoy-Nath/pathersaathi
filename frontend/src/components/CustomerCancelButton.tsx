'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking } from '@/app/bookings/actions'

type CustomerCancelButtonProps = {
  bookingId: string
  status: string
}

export default function CustomerCancelButton({ bookingId, status }: CustomerCancelButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  if (status !== 'pending') {
    return null
  }

  const handleCancel = () => {
    if (confirm('Are you sure you want to cancel this booking?')) {
      startTransition(async () => {
        const result = await cancelBooking(bookingId)
        if (result.error) {
          alert(result.error)
        } else {
          router.refresh()
        }
      })
    }
  }

  return (
    <button
      onClick={handleCancel}
      disabled={isPending}
      className="text-sm font-semibold text-red-600 hover:text-red-800 disabled:opacity-50 transition flex items-center gap-1"
    >
      {isPending ? (
        <>
          <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
          Cancelling...
        </>
      ) : (
        'Cancel Booking'
      )}
    </button>
  )
}

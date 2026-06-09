'use client'

import { useTransition, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cancelBooking } from '@/app/bookings/actions'
import { toast } from 'sonner'

type CustomerCancelButtonProps = {
  bookingId: string
  status: string
}

export default function CustomerCancelButton({ bookingId, status }: CustomerCancelButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [showConfirm, setShowConfirm] = useState(false)

  if (status !== 'pending') {
    return null
  }

  const handleCancel = () => {
    setShowConfirm(false)
    startTransition(async () => {
      const result = await cancelBooking(bookingId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Booking cancelled successfully")
        router.refresh()
      }
    })
  }

  return (
    <>
      <button
        onClick={() => setShowConfirm(true)}
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

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 border border-red-100">
            <div className="p-8">
              <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
                <span className="material-symbols-outlined text-red-500 text-3xl">warning</span>
              </div>
              <h3 className="text-2xl font-bold text-center text-[#00342b] mb-2">Cancel Booking?</h3>
              <p className="text-center text-[#3f4945] mb-8 text-sm leading-relaxed">
                Are you sure you want to cancel this booking? This action cannot be undone and your seats will be released.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-100 text-gray-700 font-bold hover:bg-gray-50 transition"
                >
                  Keep It
                </button>
                <button
                  onClick={handleCancel}
                  className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-bold hover:bg-red-600 transition shadow-sm"
                >
                  Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

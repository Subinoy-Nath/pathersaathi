'use client'

import { useState, useTransition } from 'react'
import { updateBookingStatus } from '@/app/operator/actions'

type BookingActionButtonsProps = {
  bookingId: string
  currentStatus: string
}

export default function BookingActionButtons({ bookingId, currentStatus }: BookingActionButtonsProps) {
  const [isPending, startTransition] = useTransition()
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [rejectReason, setRejectReason] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const handleAction = (status: 'approved' | 'rejected' | 'cancelled', reason?: string) => {
    startTransition(async () => {
      const result = await updateBookingStatus(bookingId, status, reason)
      if (result.error) {
        alert(result.error)
      } else {
        setShowCancelForm(false)
        setShowRejectInput(false)
        setCancelReason('')
        setRejectReason('')
      }
    })
  }

  // Pending bookings: Approve / Reject
  if (currentStatus === 'pending') {
    return (
      <div className="flex flex-col gap-2 mt-2">
        <button
          onClick={() => handleAction('approved')}
          disabled={isPending}
          className="w-full text-xs font-semibold px-2 py-1 bg-green-50 text-green-700 hover:bg-green-100 border border-green-200 rounded transition disabled:opacity-50 flex items-center justify-center gap-1"
        >
          {isPending ? (
            <>
              <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
              ...
            </>
          ) : 'Approve'}
        </button>

        {!showRejectInput ? (
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isPending}
            className="w-full text-xs font-semibold px-2 py-1 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 rounded transition disabled:opacity-50"
          >
            Reject
          </button>
        ) : (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              placeholder="Reason for rejection (optional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-red-200 rounded focus:outline-none focus:ring-1 focus:ring-red-300"
            />
            <div className="flex gap-1">
              <button
                onClick={() => handleAction('rejected', rejectReason || undefined)}
                disabled={isPending}
                className="flex-1 text-xs font-semibold px-2 py-1 bg-red-600 text-white hover:bg-red-700 rounded transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                    ...
                  </>
                ) : 'Confirm Reject'}
              </button>
              <button
                onClick={() => { setShowRejectInput(false); setRejectReason('') }}
                disabled={isPending}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Approved bookings: Cancel with mandatory reason
  if (currentStatus === 'approved') {
    return (
      <div className="flex flex-col gap-2 mt-2">
        {!showCancelForm ? (
          <button
            onClick={() => setShowCancelForm(true)}
            disabled={isPending}
            className="w-full text-xs font-semibold px-2 py-1 bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 rounded transition disabled:opacity-50"
          >
            Cancel Booking
          </button>
        ) : (
          <div className="flex flex-col gap-1 p-2 bg-orange-50 border border-orange-200 rounded">
            <label className="text-xs font-semibold text-orange-800">
              Cancellation reason (required):
            </label>
            <input
              type="text"
              placeholder="e.g., Vehicle breakdown, Route cancelled"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="w-full text-xs px-2 py-1 border border-orange-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-400"
            />
            <div className="flex gap-1 mt-1">
              <button
                onClick={() => handleAction('cancelled', cancelReason)}
                disabled={isPending || cancelReason.trim().length < 3}
                className="flex-1 text-xs font-semibold px-2 py-1 bg-orange-600 text-white hover:bg-orange-700 rounded transition disabled:opacity-50 flex items-center justify-center gap-1"
              >
                {isPending ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-[14px]">progress_activity</span>
                    ...
                  </>
                ) : 'Confirm Cancel'}
              </button>
              <button
                onClick={() => { setShowCancelForm(false); setCancelReason('') }}
                disabled={isPending}
                className="text-xs px-2 py-1 text-gray-500 hover:text-gray-700 transition"
              >
                Back
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return null
}

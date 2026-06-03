'use client'

import { useState } from 'react'
import { updateProfile, updatePassword } from './actions'

type ProfileFormProps = {
  name: string
  phone_number: string | null
  email: string
  role: string
  verification_status: string
}

export default function ProfileForm({ name, phone_number, email, role, verification_status }: ProfileFormProps) {
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileResult, setProfileResult] = useState<{ success?: boolean; error?: string } | null>(null)

  const [passwordLoading, setPasswordLoading] = useState(false)
  const [passwordResult, setPasswordResult] = useState<{ success?: boolean; error?: string } | null>(null)

  // Client-side phone validation (mirrors server-side)
  const PHONE_REGEX = /^\+91[0-9]{10}$/

  const handleProfileSubmit = async (formData: FormData) => {
    setProfileLoading(true)
    setProfileResult(null)

    // Client-side validation
    const nameVal = (formData.get('name') as string)?.trim()
    const phoneVal = (formData.get('phone_number') as string)?.trim()

    if (!nameVal || nameVal.length < 2) {
      setProfileResult({ error: 'Name must be at least 2 characters.' })
      setProfileLoading(false)
      return
    }

    if (!phoneVal || !PHONE_REGEX.test(phoneVal)) {
      setProfileResult({ error: 'Phone number must be in format +91XXXXXXXXXX.' })
      setProfileLoading(false)
      return
    }

    try {
      const result = await updateProfile(formData)
      setProfileResult(result)
    } catch {
      setProfileResult({ error: 'An unexpected error occurred.' })
    }
    setProfileLoading(false)
  }

  const handlePasswordSubmit = async (formData: FormData) => {
    setPasswordLoading(true)
    setPasswordResult(null)

    const newPw = formData.get('new_password') as string
    const confirmPw = formData.get('confirm_password') as string

    if (!newPw || newPw.length < 8) {
      setPasswordResult({ error: 'Password must be at least 8 characters.' })
      setPasswordLoading(false)
      return
    }

    if (newPw !== confirmPw) {
      setPasswordResult({ error: 'Passwords do not match.' })
      setPasswordLoading(false)
      return
    }

    try {
      const result = await updatePassword(formData)
      setPasswordResult(result)
    } catch {
      setPasswordResult({ error: 'An unexpected error occurred.' })
    }
    setPasswordLoading(false)
  }

  return (
    <div className="space-y-8">
      {/* Read-only Account Info */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Account Information</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <span className="text-sm text-gray-500 block mb-1">Email</span>
            <span className="font-medium text-gray-900">{email}</span>
          </div>
          <div>
            <span className="text-sm text-gray-500 block mb-1">Role</span>
            <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${
              role === 'operator' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
            }`}>
              {role}
            </span>
          </div>
          <div>
            <span className="text-sm text-gray-500 block mb-1">Verification Status</span>
            <span className={`inline-flex px-3 py-1 text-xs font-bold uppercase tracking-wide rounded-full ${
              verification_status === 'verified' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
            }`}>
              {verification_status}
            </span>
          </div>
        </div>
      </section>

      {/* Editable Profile */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Profile Details</h2>

        {profileResult?.success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-100">
            Profile updated successfully.
          </div>
        )}
        {profileResult?.error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl font-medium border border-red-100">
            {profileResult.error}
          </div>
        )}

        <form action={handleProfileSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <input
              id="name"
              name="name"
              type="text"
              defaultValue={name}
              required
              minLength={2}
              maxLength={100}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number <span className="text-gray-400">(+91XXXXXXXXXX)</span>
            </label>
            <input
              id="phone_number"
              name="phone_number"
              type="tel"
              defaultValue={phone_number || ''}
              required
              pattern="^\+91[0-9]{10}$"
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition"
              placeholder="+919876543210"
            />
            <p className="text-xs text-gray-400 mt-1">Format: +91 followed by 10 digits. Used for WhatsApp contact links.</p>
          </div>
          <button
            type="submit"
            disabled={profileLoading}
            className="bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {profileLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Saving...
              </>
            ) : (
              'Save Profile'
            )}
          </button>
        </form>
      </section>

      {/* Password Change */}
      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Change Password</h2>

        {passwordResult?.success && (
          <div className="mb-4 p-4 bg-green-50 text-green-700 rounded-xl font-medium border border-green-100">
            Password updated successfully.
          </div>
        )}
        {passwordResult?.error && (
          <div className="mb-4 p-4 bg-red-50 text-red-700 rounded-xl font-medium border border-red-100">
            {passwordResult.error}
          </div>
        )}

        <form action={handlePasswordSubmit} className="space-y-4">
          <div>
            <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
            <input
              id="new_password"
              name="new_password"
              type="password"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition"
              placeholder="Minimum 8 characters"
            />
          </div>
          <div>
            <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
            <input
              id="confirm_password"
              name="confirm_password"
              type="password"
              required
              minLength={8}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition"
              placeholder="Repeat your new password"
            />
          </div>
          <button
            type="submit"
            disabled={passwordLoading}
            className="bg-gray-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-gray-800 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {passwordLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin text-sm">progress_activity</span>
                Updating...
              </>
            ) : (
              'Update Password'
            )}
          </button>
        </form>
      </section>
    </div>
  )
}

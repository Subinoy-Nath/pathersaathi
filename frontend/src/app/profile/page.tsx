import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const supabase = await createClient()

  // 1. Identity from server
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. Fetch profile from public.users (source of truth for role/verification)
  const { data: profile, error } = await supabase
    .from('users')
    .select('name, phone_number, email, role, verification_status')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-8">My Profile</h1>
        <ProfileForm
          name={profile.name}
          phone_number={profile.phone_number}
          email={profile.email}
          role={profile.role}
          verification_status={profile.verification_status}
        />
      </div>
    </div>
  )
}

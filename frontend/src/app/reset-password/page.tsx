import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import ResetPasswordForm from './ResetPasswordForm'

export const metadata = {
  title: 'Set New Password | Pather Saathi',
  description: 'Set a new password for your Pather Saathi account.',
}

export default async function ResetPasswordPage() {
  const supabase = await createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (!user || error) {
    redirect(
      '/forgot-password?message=' +
        encodeURIComponent('Your password reset session has expired or is invalid. Please request a new link.')
    )
  }

  return <ResetPasswordForm />
}

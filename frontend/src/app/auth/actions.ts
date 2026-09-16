'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'

async function getBaseUrl(): Promise<string> {
  const headerList = await headers()
  const host = headerList.get('x-forwarded-host') || headerList.get('host')
  const proto = headerList.get('x-forwarded-proto') || (process.env.NODE_ENV === 'production' ? 'https' : 'http')
  if (host) {
    return `${proto}://${host}`
  }
  return process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
}

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  
  revalidatePath('/', 'layout')
  redirect('/')
}

export async function requestPasswordReset(formData: FormData): Promise<{ success: boolean; error?: string; email?: string }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase = await createClient()
    const baseUrl = await getBaseUrl()
    const redirectTo = `${baseUrl}/auth/callback?next=/reset-password`

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, email }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
    return { success: false, error: errorMsg }
  }
}

export async function completePasswordReset(formData: FormData): Promise<{ success: boolean; error?: string }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!password || password.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters long.' }
  }

  if (password !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  try {
    const supabase = await createClient()
    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      return { success: false, error: error.message }
    }

    revalidatePath('/', 'layout')
    return { success: true }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Failed to update password.'
    return { success: false, error: errorMsg }
  }
}

export async function sendMagicLink(formData: FormData): Promise<{ success: boolean; error?: string; email?: string }> {
  const email = (formData.get('email') as string)?.trim().toLowerCase()

  if (!email || !email.includes('@') || !email.includes('.')) {
    return { success: false, error: 'Please enter a valid email address.' }
  }

  try {
    const supabase = await createClient()
    const baseUrl = await getBaseUrl()
    const emailRedirectTo = `${baseUrl}/auth/callback?next=/`

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
      },
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, email }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.'
    return { success: false, error: errorMsg }
  }
}

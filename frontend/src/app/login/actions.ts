'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { normalizeIndianPhoneNumber } from '@/utils/phone'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    redirect(`/login?message=${encodeURIComponent(error.message || 'Could not authenticate user')}`)
  }

  revalidatePath('/', 'layout')
  redirect('/')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const phone_raw = formData.get('phone_number') as string

  // Phone Validation and Normalization
  const phoneResult = normalizeIndianPhoneNumber(phone_raw)
  if (!phoneResult.valid) {
    redirect(`/login?mode=signup&message=${encodeURIComponent(phoneResult.error || 'Invalid phone number')}`)
  }
  const phone_number = phoneResult.normalized

  if (!name || name.trim().length < 2) {
    redirect('/login?mode=signup&message=Name is required and must be at least 2 characters')
  }

  const data = {
    email,
    password,
    options: {
      data: {
        name: name.trim(),
        phone_number: phone_number,
      }
    }
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    redirect(`/login?mode=signup&message=${encodeURIComponent(error.message || 'Could not register user')}`)
  }

  // If session is null after signup, email verification is required
  if (authData.user && !authData.session) {
    redirect('/login?message=Account created! Please check your email inbox (and spam folder) to verify your account before logging in.')
  }

  // Note: auth trigger handles public.users insertion securely.

  revalidatePath('/', 'layout')
  redirect('/')
}

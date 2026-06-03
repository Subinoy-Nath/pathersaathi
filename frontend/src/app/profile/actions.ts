'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// Strict Indian phone number format
const PHONE_REGEX = /^\+91[0-9]{10}$/

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  // 1. Identity from server — never trust client
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  // 2. Extract ONLY whitelisted fields
  const name = (formData.get('name') as string)?.trim()
  const phone_number = (formData.get('phone_number') as string)?.trim()

  // 3. Validate name
  if (!name || name.length < 2 || name.length > 100) {
    return { success: false, error: 'Name must be between 2 and 100 characters.' }
  }

  // 4. Validate phone (strict +91 format — security requirement for wa.me links)
  if (!phone_number || !PHONE_REGEX.test(phone_number)) {
    return { success: false, error: 'Phone number must be in format +91XXXXXXXXXX (10 digits after +91).' }
  }

  // 5. Explicit field whitelist — never spread formData onto DB update
  const { error: updateError } = await supabase
    .from('users')
    .update({
      name: name,
      phone_number: phone_number,
    })
    .eq('id', user.id)

  if (updateError) {
    return { success: false, error: 'Failed to update profile: ' + updateError.message }
  }

  // Also sync metadata in auth.users for consistency
  await supabase.auth.updateUser({
    data: {
      name: name,
      phone_number: phone_number,
    }
  })

  revalidatePath('/profile')
  revalidatePath('/', 'layout')
  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const supabase = await createClient()

  // 1. Identity from server
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return { success: false, error: 'You must be logged in.' }
  }

  // 2. Extract and validate
  const newPassword = formData.get('new_password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (!newPassword || newPassword.length < 8) {
    return { success: false, error: 'Password must be at least 8 characters.' }
  }

  if (newPassword !== confirmPassword) {
    return { success: false, error: 'Passwords do not match.' }
  }

  // 3. Route through Supabase Auth — never touch public.users for passwords
  const { error: passwordError } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (passwordError) {
    return { success: false, error: 'Failed to update password: ' + passwordError.message }
  }

  return { success: true }
}

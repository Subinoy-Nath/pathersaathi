import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')
  let next = searchParams.get('next') || '/'

  // Resolve forwarded host and protocol when behind reverse proxies/CDNs (e.g. Vercel)
  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const baseUrl = forwardedHost
    ? `${forwardedProto || 'https'}://${forwardedHost}`
    : origin

  // If Supabase returned an error in the query parameters
  if (error || errorDescription) {
    const errorMsg = errorDescription || error || 'Authentication failed'
    return NextResponse.redirect(`${baseUrl}/login?message=${encodeURIComponent(errorMsg)}`)
  }

  // Open Redirect Defense: ensure next is a relative URL path starting with a single '/'
  // Strictly disallow protocol-relative '//', backslashes, or URI schemes
  if (
    !next.startsWith('/') ||
    next.startsWith('//') ||
    next.includes('\\') ||
    next.includes(':')
  ) {
    next = '/'
  }

  // If authorization code is present, exchange it for an authenticated session
  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!exchangeError) {
      return NextResponse.redirect(`${baseUrl}${next}`)
    }

    return NextResponse.redirect(
      `${baseUrl}/login?message=${encodeURIComponent(exchangeError.message)}`
    )
  }

  // Missing code parameter
  return NextResponse.redirect(
    `${baseUrl}/login?message=${encodeURIComponent('Invalid authentication request. Missing authorization code.')}`
  )
}

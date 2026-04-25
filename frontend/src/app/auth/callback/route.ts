import { createServerSupabaseClient } from '@/lib/supabase-server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const redirectToLogin = (errorCode: string) =>
    NextResponse.redirect(`${origin}/login?error=${errorCode}`)

  if (code) {
    const supabase = await createServerSupabaseClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`)
    }

    const normalized = error.message.toLowerCase()
    if (normalized.includes('expired') || normalized.includes('otp')) {
      return redirectToLogin('auth_link_expired')
    }
  }

  return redirectToLogin('auth_callback_failed')
}

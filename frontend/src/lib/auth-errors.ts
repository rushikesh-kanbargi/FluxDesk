type AuthAction =
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'reset-password'
  | 'oauth'
  | 'callback'

const CALLBACK_ERROR_MESSAGES: Record<string, string> = {
  auth_callback_failed: 'We could not complete sign-in. Please try again.',
  auth_link_expired: 'This sign-in link has expired. Request a new one and try again.',
}

function normalize(message: string) {
  return message.trim().toLowerCase()
}

function genericForAction(action: AuthAction): string {
  switch (action) {
    case 'login':
      return 'Unable to sign in right now. Please try again.'
    case 'register':
      return 'Unable to create your account right now. Please try again.'
    case 'forgot-password':
      return 'Unable to send the reset email right now. Please try again.'
    case 'reset-password':
      return 'Unable to update your password right now. Please try again.'
    case 'oauth':
    case 'callback':
      return 'We could not complete sign-in. Please try again.'
  }
}

function humanizeSupabaseErrorMessage(raw: string): string {
  const t = raw.trim()
  if (t.length === 0) return t
  const cap = t.charAt(0).toUpperCase() + t.slice(1)
  if (t.length > 200) return cap.slice(0, 197) + '…'
  return cap
}

export function getAuthCallbackErrorMessage(code: string | null | undefined): string | null {
  if (!code) return null
  return CALLBACK_ERROR_MESSAGES[code] || 'We could not complete sign-in. Please try again.'
}

export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  const raw =
    typeof error === 'string'
      ? error
      : error && typeof error === 'object' && 'message' in error && typeof (error as { message: unknown }).message === 'string'
        ? (error as { message: string }).message
        : null

  if (!raw) {
    return genericForAction(action)
  }

  const message = normalize(raw)

  if (
    message.includes('invalid login credentials') ||
    message.includes('invalid credentials') ||
    message.includes('email not found') ||
    message.includes('invalid email or password')
  ) {
    return 'Email or password is incorrect.'
  }

  if (
    message.includes('email not confirmed') ||
    message.includes('signup requires email verification') ||
    message.includes('email address not authorized')
  ) {
    return 'Check your email and confirm your account before signing in.'
  }

  if (
    message.includes('user already registered') ||
    message.includes('already registered') ||
    message.includes('already been registered')
  ) {
    return 'An account with this email already exists. Sign in instead.'
  }

  if (
    message.includes('password should be at least') ||
    message.includes('password is too short') ||
    message.includes('weak password')
  ) {
    return 'Use a stronger password with at least 8 characters.'
  }

  if (message.includes('same password') || message.includes('new password should be different')) {
    return 'Choose a new password that is different from your current password.'
  }

  if (
    message.includes('email rate limit exceeded') ||
    message.includes('over_email_send_rate_limit') ||
    (message.includes('security purposes') && message.includes('email')) ||
    message.includes('too many requests')
  ) {
    return 'Too many attempts. Wait a few minutes and try again.'
  }

  if (message.includes('expired') || message.includes('otp expired') || message.includes('token has expired')) {
    return action === 'reset-password' || action === 'callback'
      ? 'This link has expired. Request a new one and try again.'
      : 'This request has expired. Please try again.'
  }

  if (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('load failed') ||
    message.includes('network error')
  ) {
    return 'Unable to reach the service. Check your connection and try again.'
  }

  // Unknown but explicit provider message: show the actual text so users can act on it
  return humanizeSupabaseErrorMessage(raw)
}

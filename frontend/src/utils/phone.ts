/**
 * Indian Mobile Phone Number Validator & Normalizer
 * Enforces E.164 compliant format for Indian mobile numbers: +91 followed by 10 digits starting with [6-9].
 */

export const INDIAN_MOBILE_REGEX = /^\+91[6-9]\d{9}$/

export interface PhoneNormalizationResult {
  valid: boolean
  normalized: string
  error?: string
}

/**
 * Normalizes user-supplied telephone inputs into canonical +91XXXXXXXXXX format.
 * Strips whitespace, dashes, parentheses, dots, and handles leading zeroes or +91 prefixes.
 */
export function normalizeIndianPhoneNumber(input: string): PhoneNormalizationResult {
  if (!input || typeof input !== 'string') {
    return {
      valid: false,
      normalized: '',
      error: 'Phone number is required.',
    }
  }

  // Remove whitespace, dashes, dots, brackets
  let cleaned = input.trim().replace(/[\s\-().]/g, '')

  // Remove leading 0 if present (common domestic dialing prefix)
  if (cleaned.startsWith('0') && cleaned.length === 11) {
    cleaned = cleaned.substring(1)
  }

  // If 10 digits starting with 6-9, prepend +91
  if (/^[6-9]\d{9}$/.test(cleaned)) {
    cleaned = `+91${cleaned}`
  } else if (/^91[6-9]\d{9}$/.test(cleaned)) {
    // Has 91 without +
    cleaned = `+${cleaned}`
  }

  // Validate canonical regex
  if (!INDIAN_MOBILE_REGEX.test(cleaned)) {
    return {
      valid: false,
      normalized: cleaned,
      error: 'Invalid Indian mobile number. Please enter a 10-digit number starting with 6, 7, 8, or 9 (e.g., +91 98765 43210).',
    }
  }

  return {
    valid: true,
    normalized: cleaned,
  }
}

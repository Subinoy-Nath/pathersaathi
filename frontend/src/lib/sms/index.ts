import { SmsOtpProvider } from './types'
import { MockSmsProvider } from './mockProvider'
import { Fast2SmsProvider } from './fast2smsProvider'
import { TwilioSmsProvider } from './twilioProvider'

export * from './types'
export * from './mockProvider'
export * from './fast2smsProvider'
export * from './twilioProvider'

let cachedProvider: SmsOtpProvider | null = null

/**
 * Returns the configured SMS OTP provider based on the SMS_PROVIDER environment variable.
 * Defaults to MockSmsProvider for local development, CI, and testing environments.
 */
export function getSmsProvider(): SmsOtpProvider {
  if (cachedProvider) {
    return cachedProvider
  }

  const providerType = (process.env.SMS_PROVIDER || 'mock').toLowerCase()

  if (providerType === 'fast2sms' && process.env.FAST2SMS_API_KEY) {
    cachedProvider = new Fast2SmsProvider(process.env.FAST2SMS_API_KEY)
    return cachedProvider
  }

  if (
    providerType === 'twilio' &&
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_FROM_NUMBER
  ) {
    cachedProvider = new TwilioSmsProvider(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_FROM_NUMBER
    )
    return cachedProvider
  }

  // Default to MockSmsProvider for seamless local development
  cachedProvider = new MockSmsProvider()
  return cachedProvider
}

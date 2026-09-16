import { SmsOtpProvider, SmsOtpResult, SmsOtpOptions } from './types'

export class Fast2SmsProvider implements SmsOtpProvider {
  readonly name = 'fast2sms'
  private apiKey: string

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  async sendOtp(phone: string, code: string, options?: SmsOtpOptions): Promise<SmsOtpResult> {
    void options
    // Extract 10-digit Indian number without +91 or leading zeroes
    const rawNumber = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(-10)

    try {
      const response = await fetch('https://www.fast2sms.com/dev/bulkV2', {
        method: 'POST',
        headers: {
          authorization: this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          route: 'otp',
          variables_values: code,
          numbers: rawNumber,
        }),
      })

      const data = await response.json()

      if (!response.ok || data.return === false) {
        return {
          success: false,
          error: data.message?.[0] || data.message || 'Fast2SMS dispatch failed.',
          provider: this.name,
        }
      }

      return {
        success: true,
        messageId: data.request_id || `fast2sms-${Date.now()}`,
        provider: this.name,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error communicating with Fast2SMS.'
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      }
    }
  }
}

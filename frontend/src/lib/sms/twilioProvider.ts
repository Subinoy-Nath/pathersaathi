import { SmsOtpProvider, SmsOtpResult, SmsOtpOptions } from './types'

export class TwilioSmsProvider implements SmsOtpProvider {
  readonly name = 'twilio'
  private accountSid: string
  private authToken: string
  private fromNumber: string

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.accountSid = accountSid
    this.authToken = authToken
    this.fromNumber = fromNumber
  }

  async sendOtp(phone: string, code: string, options?: SmsOtpOptions): Promise<SmsOtpResult> {
    void options
    try {
      const authHeader = 'Basic ' + Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64')
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`
      const body = new URLSearchParams({
        To: formattedPhone,
        From: this.fromNumber,
        Body: `Your Pather Saathi verification code is ${code}. Valid for 10 minutes. Do not share this OTP with anyone.`,
      })

      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: body.toString(),
        }
      )

      const data = await response.json()

      if (!response.ok || data.error_code) {
        return {
          success: false,
          error: data.message || `Twilio SMS dispatch failed (Code ${data.error_code || response.status}).`,
          provider: this.name,
        }
      }

      return {
        success: true,
        messageId: data.sid,
        provider: this.name,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Network error communicating with Twilio.'
      return {
        success: false,
        error: errorMsg,
        provider: this.name,
      }
    }
  }
}

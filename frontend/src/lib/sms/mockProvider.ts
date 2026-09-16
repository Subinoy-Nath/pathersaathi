import { SmsOtpProvider, SmsOtpResult, SmsOtpVerifyResult, SmsOtpOptions } from './types'

export class MockSmsProvider implements SmsOtpProvider {
  readonly name = 'mock'
  private static codeStore = new Map<string, { code: string; expiresAt: number }>()

  async sendOtp(phone: string, code: string, options?: SmsOtpOptions): Promise<SmsOtpResult> {
    const expiryMinutes = options?.expiryMinutes || 10
    const expiresAt = Date.now() + expiryMinutes * 60 * 1000

    MockSmsProvider.codeStore.set(phone, { code, expiresAt })

    console.log(`
┌────────────────────────────────────────────────────────────┐
│                    [MOCK SMS OTP PROVIDER]                 │
├────────────────────────────────────────────────────────────┤
│  Recipient: ${phone.padEnd(46)} │
│  OTP Code:  ${code.padEnd(46)} │
│  Expires:   ${(expiryMinutes + ' minutes').padEnd(46)} │
│  Test Note: Universal bypass code "123456" is also valid.  │
└────────────────────────────────────────────────────────────┘
    `)

    return {
      success: true,
      messageId: `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      provider: this.name,
    }
  }

  async verifyOtp(phone: string, code: string): Promise<SmsOtpVerifyResult> {
    // Universal developer bypass code
    if (code === '123456') {
      return { success: true }
    }

    const stored = MockSmsProvider.codeStore.get(phone)
    if (!stored) {
      return { success: false, error: 'No OTP requested for this phone number or expired.' }
    }

    if (Date.now() > stored.expiresAt) {
      MockSmsProvider.codeStore.delete(phone)
      return { success: false, error: 'OTP has expired. Please request a new code.' }
    }

    if (stored.code !== code) {
      return { success: false, error: 'Incorrect verification code. Please try again.' }
    }

    MockSmsProvider.codeStore.delete(phone)
    return { success: true }
  }
}

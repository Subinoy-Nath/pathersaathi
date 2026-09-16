/**
 * Pluggable SMS OTP Provider Abstraction Interfaces
 */

export interface SmsOtpResult {
  success: boolean
  messageId?: string
  error?: string
  provider: string
}

export interface SmsOtpVerifyResult {
  success: boolean
  error?: string
}

export interface SmsOtpOptions {
  templateId?: string
  senderId?: string
  expiryMinutes?: number
}

export interface SmsOtpProvider {
  readonly name: string
  sendOtp(phone: string, code: string, options?: SmsOtpOptions): Promise<SmsOtpResult>
  verifyOtp?(phone: string, code: string): Promise<SmsOtpVerifyResult>
}

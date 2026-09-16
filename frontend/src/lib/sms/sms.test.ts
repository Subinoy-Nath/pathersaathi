import assert from 'node:assert'
import test from 'node:test'
import { MockSmsProvider } from './mockProvider'
import { getSmsProvider } from './index'

test('MockSmsProvider sendOtp returns success with messageId', async () => {
  const provider = new MockSmsProvider()
  const result = await provider.sendOtp('+919876543210', '789123')
  assert.strictEqual(result.success, true)
  assert.strictEqual(result.provider, 'mock')
  assert.ok(result.messageId?.startsWith('mock-'))
})

test('MockSmsProvider verifyOtp verifies valid OTP', async () => {
  const provider = new MockSmsProvider()
  await provider.sendOtp('+919876543210', '654321')
  const verifyResult = await provider.verifyOtp('+919876543210', '654321')
  assert.strictEqual(verifyResult.success, true)
})

test('MockSmsProvider verifyOtp succeeds with universal bypass code 123456', async () => {
  const provider = new MockSmsProvider()
  const verifyResult = await provider.verifyOtp('+919999999999', '123456')
  assert.strictEqual(verifyResult.success, true)
})

test('MockSmsProvider verifyOtp rejects invalid code', async () => {
  const provider = new MockSmsProvider()
  await provider.sendOtp('+919876543211', '112233')
  const verifyResult = await provider.verifyOtp('+919876543211', '999999')
  assert.strictEqual(verifyResult.success, false)
  assert.strictEqual(verifyResult.error, 'Incorrect verification code. Please try again.')
})

test('getSmsProvider returns MockSmsProvider by default', () => {
  const provider = getSmsProvider()
  assert.strictEqual(provider.name, 'mock')
})

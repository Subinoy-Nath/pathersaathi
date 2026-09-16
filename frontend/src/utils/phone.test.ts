import assert from 'node:assert'
import test from 'node:test'
import { normalizeIndianPhoneNumber, INDIAN_MOBILE_REGEX } from './phone'

test('normalizeIndianPhoneNumber with valid 10-digit number', () => {
  const result = normalizeIndianPhoneNumber('9876543210')
  assert.strictEqual(result.valid, true)
  assert.strictEqual(result.normalized, '+919876543210')
  assert.strictEqual(result.error, undefined)
  assert.match(result.normalized, INDIAN_MOBILE_REGEX)
})

test('normalizeIndianPhoneNumber with leading zero', () => {
  const result = normalizeIndianPhoneNumber('09876543210')
  assert.strictEqual(result.valid, true)
  assert.strictEqual(result.normalized, '+919876543210')
})

test('normalizeIndianPhoneNumber with spaces and hyphens', () => {
  const result = normalizeIndianPhoneNumber('+91 98765-43210')
  assert.strictEqual(result.valid, true)
  assert.strictEqual(result.normalized, '+919876543210')
})

test('normalizeIndianPhoneNumber with 91 prefix without plus', () => {
  const result = normalizeIndianPhoneNumber('919876543210')
  assert.strictEqual(result.valid, true)
  assert.strictEqual(result.normalized, '+919876543210')
})

test('normalizeIndianPhoneNumber rejects invalid leading digits [0-5]', () => {
  const result = normalizeIndianPhoneNumber('5876543210')
  assert.strictEqual(result.valid, false)
  assert.ok(result.error?.includes('Invalid Indian mobile number'))
})

test('normalizeIndianPhoneNumber rejects strings with letters', () => {
  const result = normalizeIndianPhoneNumber('abcdefghij')
  assert.strictEqual(result.valid, false)
})

test('normalizeIndianPhoneNumber rejects empty or null input', () => {
  const result = normalizeIndianPhoneNumber('')
  assert.strictEqual(result.valid, false)
  assert.strictEqual(result.error, 'Phone number is required.')
})

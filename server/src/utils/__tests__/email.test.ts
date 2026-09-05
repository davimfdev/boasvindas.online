import { describe, expect, it } from 'vitest'
import { normalizeEmail } from '../email.js'

describe('normalizeEmail', () => {
  it('lowercases the address', () => {
    expect(normalizeEmail('HOST@Example.COM')).toBe('host@example.com')
  })

  it('drops surrounding whitespace', () => {
    expect(normalizeEmail('  host@example.com  ')).toBe('host@example.com')
  })

  it('handles casing and padding together', () => {
    expect(normalizeEmail('  HOST@Example.COM  ')).toBe('host@example.com')
  })

  it('leaves an already canonical address untouched', () => {
    expect(normalizeEmail('host@example.com')).toBe('host@example.com')
  })

  // The rate limiter feeds it straight from the request body, which may be
  // anything at all before validation has run.
  it('turns a missing value into an empty string', () => {
    expect(normalizeEmail(undefined)).toBe('')
  })

  it('turns null into an empty string', () => {
    expect(normalizeEmail(null)).toBe('')
  })

  it('is idempotent', () => {
    expect(normalizeEmail(normalizeEmail('  HOST@Example.COM  '))).toBe('host@example.com')
  })
})

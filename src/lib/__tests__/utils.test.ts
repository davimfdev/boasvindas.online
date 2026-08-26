import { describe, it, expect } from 'vitest'
import { generateSlug, isSlugReserved, isSlugValid } from '../utils'

describe('generateSlug', () => {
  it('lowercases and hyphenates', () => {
    expect(generateSlug('Apartamento Lindo')).toBe('apartamento-lindo')
  })
  it('strips accents', () => {
    expect(generateSlug('Apartaménto')).toBe('apartamento')
  })
  it('truncates to 50 chars', () => {
    expect(generateSlug('a'.repeat(60))).toHaveLength(50)
  })
})

describe('isSlugReserved', () => {
  it('blocks reserved slugs', () => {
    expect(isSlugReserved('app')).toBe(true)
    expect(isSlugReserved('login')).toBe(true)
    expect(isSlugReserved('API')).toBe(true)
  })
  it('allows normal slugs', () => {
    expect(isSlugReserved('flatipe')).toBe(false)
    expect(isSlugReserved('suite-101')).toBe(false)
  })
})

describe('isSlugValid', () => {
  it('accepts valid slugs', () => {
    expect(isSlugValid('flatipe')).toBe(true)
    expect(isSlugValid('flat-123')).toBe(true)
  })
  it('rejects hyphen-first', () => {
    expect(isSlugValid('-start')).toBe(false)
  })
  it('rejects single char', () => {
    expect(isSlugValid('a')).toBe(false)
  })
  it('rejects spaces', () => {
    expect(isSlugValid('has space')).toBe(false)
  })
  it('rejects uppercase', () => {
    expect(isSlugValid('FlatIpe')).toBe(false)
  })
})

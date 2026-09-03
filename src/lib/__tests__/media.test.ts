import { describe, expect, it } from 'vitest'
import { mediaSrcSet } from '@/lib/media'

const UPLOADED = '/api/media/33333333-3333-4333-8333-333333333333'

describe('mediaSrcSet', () => {
  it('offers every stored width for an uploaded image', () => {
    expect(mediaSrcSet(UPLOADED)).toBe(
      `${UPLOADED}?w=400 400w, ${UPLOADED}?w=800 800w, ${UPLOADED}?w=1600 1600w`,
    )
  })

  it('returns nothing for an external URL the host pasted', () => {
    expect(mediaSrcSet('https://i.imgur.com/abc123.jpg')).toBeUndefined()
  })

  it('returns nothing for a media path that is not a media id', () => {
    expect(mediaSrcSet('/api/media/../../etc/passwd')).toBeUndefined()
  })

  it('returns nothing for an empty value', () => {
    expect(mediaSrcSet('')).toBeUndefined()
  })
})

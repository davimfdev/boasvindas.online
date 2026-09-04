import { describe, expect, it } from 'vitest'
import { chooseHeroImage, HERO_IMAGES } from '../hero-image'

const IMAGES = ['a', 'b', 'c']

/** The whole random range, so the assertions cover every draw, not one of them. */
const DRAWS = [0, 0.2, 0.4, 0.6, 0.8, 0.999]

describe('chooseHeroImage', () => {
  // The point of the feature: a reload has to change something.
  it('never returns the image the previous load showed', () => {
    const picks = DRAWS.map((r) => chooseHeroImage(IMAGES, 'a', () => r))
    expect(picks).not.toContain('a')
  })

  it('can still return every other image', () => {
    const picks = DRAWS.map((r) => chooseHeroImage(IMAGES, 'a', () => r))
    expect(new Set(picks)).toEqual(new Set(['b', 'c']))
  })

  it('draws from the whole set when there is no previous image', () => {
    const picks = DRAWS.map((r) => chooseHeroImage(IMAGES, null, () => r))
    expect(new Set(picks)).toEqual(new Set(IMAGES))
  })

  it('ignores a previous image that is no longer in the set', () => {
    const picks = DRAWS.map((r) => chooseHeroImage(IMAGES, 'removida', () => r))
    expect(new Set(picks)).toEqual(new Set(IMAGES))
  })

  // Excluding the only candidate would leave nothing to show.
  it('returns the only image even when it was the previous one', () => {
    expect(chooseHeroImage(['a'], 'a', () => 0)).toBe('a')
  })

  it('stays inside the set at the very top of the random range', () => {
    expect(IMAGES).toContain(chooseHeroImage(IMAGES, null, () => 0.999999))
  })
})

describe('HERO_IMAGES', () => {
  it('holds enough photographs for a reload to differ', () => {
    expect(HERO_IMAGES.length).toBeGreaterThanOrEqual(2)
  })

  it('lists every photograph only once', () => {
    expect(new Set(HERO_IMAGES).size).toBe(HERO_IMAGES.length)
  })

  // Same provider the hero already used, so nothing new is introduced.
  it('serves every photograph from the Unsplash CDN', () => {
    const foreign = HERO_IMAGES.filter((url) => !url.startsWith('https://images.unsplash.com/'))
    expect(foreign).toEqual([])
  })
})

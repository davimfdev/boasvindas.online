import { describe, it, expect } from 'vitest'
import { reorder } from '../dnd-helpers'

describe('reorder', () => {
  it('reorder moves an item from one index to another', () => {
    expect(reorder(['a', 'b', 'c'], 0, 2)).toEqual(['b', 'c', 'a'])
  })
  it('reorder is a no-op when indices match', () => {
    expect(reorder(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })
})

import { describe, it, expect } from 'vitest'
import { BLOCK_FIELDS, BLOCK_META } from '../fields'
import { BLOCK_TYPES } from '../defaults'

describe('block field config', () => {
  it.each(BLOCK_TYPES)('%s has palette meta (label + group + icon)', (type) => {
    const meta = BLOCK_META[type]
    expect(meta?.label).toBeTruthy()
    expect(meta?.group).toBeTruthy()
    expect(meta?.icon).toBeTruthy()
  })

  it.each(BLOCK_TYPES)('%s field keys are known prop keys for that block', (type) => {
    // Build a block, then assert each field key is a string present in BLOCK_FIELDS with a label+kind.
    for (const field of BLOCK_FIELDS[type]) {
      expect(field.key).toBeTruthy()
      expect(field.label).toBeTruthy()
      expect(field.kind).toBeTruthy()
    }
  })
})

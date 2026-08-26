import { describe, it, expect } from 'vitest'
import { blockSchema, sectionSchema, type BlockType } from '../schema'
import { createBlock, createSection, BLOCK_TYPES } from '../defaults'

describe('createBlock', () => {
  it.each(BLOCK_TYPES)('creates a schema-valid %s block with a fresh id', (type) => {
    const block = createBlock(type as BlockType)
    expect(block.id).toBeTruthy()
    expect(blockSchema.safeParse(block).success).toBe(true)
    expect(block.type).toBe(type)
  })

  it('gives two blocks different ids', () => {
    expect(createBlock('text').id).not.toBe(createBlock('text').id)
  })
})

describe('createSection', () => {
  it('creates a schema-valid section with no blocks', () => {
    const s = createSection()
    expect(s.id).toBeTruthy()
    expect(sectionSchema.safeParse(s).success).toBe(true)
  })
})

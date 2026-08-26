import type { CSSProperties } from 'react'
import type { Block } from './schema'

// Blocks whose media should stretch to fill an explicit layout.height box.
export const FILLABLE_BLOCKS: ReadonlySet<string> = new Set(['hero', 'image', 'carousel'])

// Implicit grid row unit (px) and the vertical breathing space baked into each item's row span.
export const GRID_ROW_UNIT = 8
export const GRID_ROW_GAP = 24

// How many implicit grid rows an item must span so its measured content (+ gap) fits.
export function gridRowSpan(heightPx: number): number {
  return Math.max(1, Math.ceil((heightPx + GRID_ROW_GAP) / GRID_ROW_UNIT))
}

export function blockGridStyle(layout: Block['layout']): CSSProperties {
  const width = Math.min(12, Math.max(1, layout?.width ?? 12))
  return { gridColumn: `span ${width}` }
}

// Snap a dragged pixel width to the nearest 1–12 column span.
export function spanFromFraction(px: number, containerPx: number): number {
  if (containerPx <= 0) return 12
  const raw = Math.round((px / containerPx) * 12)
  return Math.min(12, Math.max(1, raw))
}

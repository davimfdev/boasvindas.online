import type { CSSProperties } from 'react'
import type { Block, BlockType } from './schema'
import { BLOCK_META } from './fields'

export const MIN_W_PX = { sm: 140, lg: 300 } as const

export function blockFlexStyle(layout: Block['layout'], type: BlockType): CSSProperties {
  const width = layout?.width ?? 12
  const pct = (width / 12) * 100
  // NOTE: the 0.75rem subtraction must match the flex container's column gap (gap-x-3) in Preview/GuestSite.
  return {
    flexBasis: width >= 12 ? '100%' : `calc(${pct}% - 0.75rem)`,
    minWidth: MIN_W_PX[BLOCK_META[type].minW],
    flexGrow: 0,
    flexShrink: 1,
    boxSizing: 'border-box',
    ...(layout?.height ? { height: layout.height } : {}),
  }
}

// Snap a dragged pixel width to the nearest 1–12 column span.
export function spanFromFraction(px: number, containerPx: number): number {
  if (containerPx <= 0) return 12
  const raw = Math.round((px / containerPx) * 12)
  return Math.min(12, Math.max(1, raw))
}

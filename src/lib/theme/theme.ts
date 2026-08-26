import type { CSSProperties } from 'react'
import type { PageContent } from '@/lib/blocks/schema'
import { FONTS, type FontKey } from './fonts'
import { PRESETS, DEFAULT_PRESET } from './presets'

export interface ResolvedTheme {
  vars: CSSProperties
  headingFont: FontKey
  bodyFont: FontKey
}

function pickFont(key: string | undefined, fallback: FontKey, kind: 'heading' | 'body'): FontKey {
  return key && FONTS[key as FontKey]?.kind === kind ? (key as FontKey) : fallback
}

export function resolveTheme(theme: PageContent['theme'], legacyEnum?: string): ResolvedTheme {
  const presetKey = theme?.preset && PRESETS[theme.preset]
    ? theme.preset
    : (legacyEnum && PRESETS[legacyEnum] ? legacyEnum : DEFAULT_PRESET)
  const preset = PRESETS[presetKey] ?? PRESETS[DEFAULT_PRESET]

  const accent = theme?.colors?.accent ?? preset.colors.accent
  const secondary = theme?.colors?.secondary ?? preset.colors.secondary
  const background = theme?.colors?.background ?? preset.colors.background

  const headingFont = pickFont(theme?.headingFont, preset.headingFont, 'heading')
  const bodyFont = pickFont(theme?.bodyFont, preset.bodyFont, 'body')

  const vars = {
    '--g-accent': accent,
    '--g-accent-strong': `color-mix(in srgb, ${accent} 70%, black)`,
    '--g-secondary': secondary,
    '--g-bg': background,
    '--g-surface': background,
    '--g-font-heading': FONTS[headingFont].family,
    '--g-font-body': FONTS[bodyFont].family,
  } as CSSProperties

  return { vars, headingFont, bodyFont }
}

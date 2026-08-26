import type { FontKey } from './fonts'

export interface Preset {
  label: string
  colors: { accent: string; secondary: string; background: string }
  headingFont: FontKey
  bodyFont: FontKey
}

export const PRESETS: Record<string, Preset> = {
  modern:   { label: 'Moderno',  colors: { accent: '#0d9488', secondary: '#fbbf24', background: '#f0fdfa' }, headingFont: 'space',     bodyFont: 'inter' },
  rustic:   { label: 'Rústico',  colors: { accent: '#5d4017', secondary: '#d99a2b', background: '#faf6f0' }, headingFont: 'playfair',  bodyFont: 'lora' },
  beach:    { label: 'Praia',    colors: { accent: '#0369a1', secondary: '#f5d0a9', background: '#f8fafc' }, headingFont: 'fraunces',  bodyFont: 'work' },
  urban:    { label: 'Urbano',   colors: { accent: '#111827', secondary: '#a3e635', background: '#fafafa' }, headingFont: 'space',     bodyFont: 'inter' },
  boutique: { label: 'Boutique', colors: { accent: '#7c2d3a', secondary: '#f3e8da', background: '#fdf8f3' }, headingFont: 'cormorant', bodyFont: 'nunito' },
  minimal:  { label: 'Minimal',  colors: { accent: '#1f2937', secondary: '#6b7280', background: '#ffffff' }, headingFont: 'bricolage', bodyFont: 'inter' },
}

export const DEFAULT_PRESET = 'modern'

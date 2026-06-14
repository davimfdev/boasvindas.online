export type FontKey =
  | 'playfair' | 'fraunces' | 'cormorant' | 'space' | 'bricolage' | 'poppins'
  | 'inter' | 'lora' | 'work' | 'nunito' | 'source' | 'plex'

export interface FontDef {
  label: string
  family: string
  kind: 'heading' | 'body'
  cssHref: string
}

const g = (param: string) => `https://fonts.googleapis.com/css2?family=${param}&display=swap`

export const FONTS: Record<FontKey, FontDef> = {
  playfair:  { label: 'Playfair Display',    family: "'Playfair Display', serif",     kind: 'heading', cssHref: g('Playfair+Display:wght@400;700') },
  fraunces:  { label: 'Fraunces',            family: "'Fraunces', serif",             kind: 'heading', cssHref: g('Fraunces:wght@400;700') },
  cormorant: { label: 'Cormorant Garamond',  family: "'Cormorant Garamond', serif",   kind: 'heading', cssHref: g('Cormorant+Garamond:wght@500;700') },
  space:     { label: 'Space Grotesk',       family: "'Space Grotesk', sans-serif",   kind: 'heading', cssHref: g('Space+Grotesk:wght@500;700') },
  bricolage: { label: 'Bricolage Grotesque', family: "'Bricolage Grotesque', sans-serif", kind: 'heading', cssHref: g('Bricolage+Grotesque:wght@600;800') },
  poppins:   { label: 'Poppins',             family: "'Poppins', sans-serif",         kind: 'heading', cssHref: g('Poppins:wght@500;700') },
  inter:     { label: 'Inter',               family: "'Inter', sans-serif",           kind: 'body',    cssHref: g('Inter:wght@400;600') },
  lora:      { label: 'Lora',                family: "'Lora', serif",                 kind: 'body',    cssHref: g('Lora:wght@400;600') },
  work:      { label: 'Work Sans',           family: "'Work Sans', sans-serif",       kind: 'body',    cssHref: g('Work+Sans:wght@400;600') },
  nunito:    { label: 'Nunito Sans',         family: "'Nunito Sans', sans-serif",     kind: 'body',    cssHref: g('Nunito+Sans:wght@400;600') },
  source:    { label: 'Source Sans 3',       family: "'Source Sans 3', sans-serif",   kind: 'body',    cssHref: g('Source+Sans+3:wght@400;600') },
  plex:      { label: 'IBM Plex Sans',       family: "'IBM Plex Sans', sans-serif",   kind: 'body',    cssHref: g('IBM+Plex+Sans:wght@400;600') },
}

export const FONT_KEYS = Object.keys(FONTS) as FontKey[]

export type FontKey =
  | 'playfair' | 'fraunces' | 'cormorant' | 'space' | 'bricolage' | 'poppins'
  | 'inter' | 'lora' | 'work' | 'nunito' | 'source' | 'plex'
  | 'clash' | 'cabinet' | 'outfit' | 'syne' | 'sora' | 'unbounded' | 'instrument' | 'dmserif'
  | 'satoshi' | 'general' | 'geist' | 'manrope' | 'figtree'

export interface FontDef {
  label: string
  family: string
  kind: 'heading' | 'body'
  cssHref: string
}

const g = (param: string) => `https://fonts.googleapis.com/css2?family=${param}&display=swap`
const fs = (param: string) => `https://api.fontshare.com/v2/css?f[]=${param}&display=swap`

export const FONTS: Record<FontKey, FontDef> = {
  // Heading — serif & display
  playfair:   { label: 'Playfair Display',    family: "'Playfair Display', serif",        kind: 'heading', cssHref: g('Playfair+Display:wght@400;700') },
  fraunces:   { label: 'Fraunces',            family: "'Fraunces', serif",                kind: 'heading', cssHref: g('Fraunces:wght@400;700') },
  cormorant:  { label: 'Cormorant Garamond',  family: "'Cormorant Garamond', serif",      kind: 'heading', cssHref: g('Cormorant+Garamond:wght@500;700') },
  instrument: { label: 'Instrument Serif',    family: "'Instrument Serif', serif",        kind: 'heading', cssHref: g('Instrument+Serif:ital@0;1') },
  dmserif:    { label: 'DM Serif Display',    family: "'DM Serif Display', serif",        kind: 'heading', cssHref: g('DM+Serif+Display:ital@0;1') },
  // Heading — grotesk & display sans
  space:      { label: 'Space Grotesk',       family: "'Space Grotesk', sans-serif",      kind: 'heading', cssHref: g('Space+Grotesk:wght@500;700') },
  bricolage:  { label: 'Bricolage Grotesque', family: "'Bricolage Grotesque', sans-serif", kind: 'heading', cssHref: g('Bricolage+Grotesque:wght@600;800') },
  poppins:    { label: 'Poppins',             family: "'Poppins', sans-serif",            kind: 'heading', cssHref: g('Poppins:wght@500;700') },
  outfit:     { label: 'Outfit',              family: "'Outfit', sans-serif",             kind: 'heading', cssHref: g('Outfit:wght@500;700') },
  syne:       { label: 'Syne',                family: "'Syne', sans-serif",               kind: 'heading', cssHref: g('Syne:wght@600;800') },
  sora:       { label: 'Sora',                family: "'Sora', sans-serif",               kind: 'heading', cssHref: g('Sora:wght@500;700') },
  unbounded:  { label: 'Unbounded',           family: "'Unbounded', sans-serif",          kind: 'heading', cssHref: g('Unbounded:wght@500;700') },
  clash:      { label: 'Clash Display',       family: "'Clash Display', sans-serif",      kind: 'heading', cssHref: fs('clash-display@400,600,700') },
  cabinet:    { label: 'Cabinet Grotesk',     family: "'Cabinet Grotesk', sans-serif",    kind: 'heading', cssHref: fs('cabinet-grotesk@500,700,800') },

  // Body
  inter:      { label: 'Inter',               family: "'Inter', sans-serif",              kind: 'body',    cssHref: g('Inter:wght@400;600') },
  lora:       { label: 'Lora',                family: "'Lora', serif",                    kind: 'body',    cssHref: g('Lora:wght@400;600') },
  work:       { label: 'Work Sans',           family: "'Work Sans', sans-serif",          kind: 'body',    cssHref: g('Work+Sans:wght@400;600') },
  nunito:     { label: 'Nunito Sans',         family: "'Nunito Sans', sans-serif",        kind: 'body',    cssHref: g('Nunito+Sans:wght@400;600') },
  source:     { label: 'Source Sans 3',       family: "'Source Sans 3', sans-serif",      kind: 'body',    cssHref: g('Source+Sans+3:wght@400;600') },
  plex:       { label: 'IBM Plex Sans',       family: "'IBM Plex Sans', sans-serif",      kind: 'body',    cssHref: g('IBM+Plex+Sans:wght@400;600') },
  geist:      { label: 'Geist',               family: "'Geist', sans-serif",              kind: 'body',    cssHref: g('Geist:wght@400;600') },
  manrope:    { label: 'Manrope',             family: "'Manrope', sans-serif",            kind: 'body',    cssHref: g('Manrope:wght@400;600') },
  figtree:    { label: 'Figtree',             family: "'Figtree', sans-serif",            kind: 'body',    cssHref: g('Figtree:wght@400;600') },
  satoshi:    { label: 'Satoshi',             family: "'Satoshi', sans-serif",            kind: 'body',    cssHref: fs('satoshi@400,500,700') },
  general:    { label: 'General Sans',        family: "'General Sans', sans-serif",       kind: 'body',    cssHref: fs('general-sans@400,500,600') },
}

export const FONT_KEYS = Object.keys(FONTS) as FontKey[]

import { z } from 'zod'

export const blockLayout = z.object({
  width: z.number().int().min(1).max(12),
  height: z.number().int().positive().optional(),
}).optional()

const base = { id: z.string().min(1), layout: blockLayout }

const safeHref = z.string().min(1).refine(
  (v) => !/^\s*(javascript|data|vbscript):/i.test(v),
  { message: 'Unsafe URL scheme' },
)

// Inspector inputs emit '' when a field is cleared; treat that as "unset" for
// optional URL fields so clearing them doesn't fail validation on save.
const optionalUrl = z.preprocess((v) => (v === '' ? undefined : v), z.string().url().optional())

/**
 * Exactly what POST /api/media/upload hands back. No other relative path
 * qualifies. The route is matched case-sensitively by Express, so only the hex
 * of the id is case-insensitive — `/API/MEDIA/<id>` would 404 on the guest page.
 */
const MANAGED_MEDIA_URL = /^\/api\/media\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/

// An uploaded image is served from our own origin, so its URL is relative and
// z.string().url() rejects it — which silently discarded every upload. Pasted
// absolute URLs keep going through the exact same check as before.
const externalUrl = z.string().url()
const mediaUrl = z.string().refine(
  (v) => MANAGED_MEDIA_URL.test(v) || externalUrl.safeParse(v).success,
  { message: 'Envie uma imagem ou informe uma URL completa' },
)

const optionalMediaUrl = z.preprocess((v) => (v === '' ? undefined : v), mediaUrl.optional())

export const headingBlock = z.object({ ...base, type: z.literal('heading'),
  props: z.object({ text: z.string(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }) })

export const textBlock = z.object({ ...base, type: z.literal('text'),
  props: z.object({ text: z.string() }) }) // plain text, rendered whitespace-pre-wrap (no raw HTML — XSS-safe)

export const imageBlock = z.object({ ...base, type: z.literal('image'),
  props: z.object({ url: mediaUrl, alt: z.string().default(''), caption: z.string().optional() }) })

export const buttonBlock = z.object({ ...base, type: z.literal('button'),
  props: z.object({ label: z.string(), href: safeHref.or(z.literal('')), kind: z.enum(['link', 'tel', 'whatsapp', 'map']).default('link') }) })

export const dividerBlock = z.object({ ...base, type: z.literal('divider'),
  props: z.object({ variant: z.enum(['line', 'spacer']).default('line') }) })

export const wifiBlock = z.object({ ...base, type: z.literal('wifi'),
  props: z.object({ ssid: z.string().min(1), password: z.string().min(1) }) })

export const checkinBlock = z.object({ ...base, type: z.literal('checkin'),
  props: z.object({ time: z.string().min(1), address: z.string(), accessCode: z.string().optional(), instructions: z.string().default('') }) })

export const checkoutBlock = z.object({ ...base, type: z.literal('checkout'),
  props: z.object({ time: z.string().min(1), items: z.array(z.string()).default([]) }) })

export const rulesBlock = z.object({ ...base, type: z.literal('rules'),
  props: z.object({ items: z.array(z.object({ icon: z.string(), label: z.string() })).default([]) }) })

export const guideBlock = z.object({ ...base, type: z.literal('guide'),
  props: z.object({ places: z.array(z.object({
    name: z.string(), blurb: z.string().default(''), distance: z.string().optional(), mapUrl: optionalUrl,
    tags: z.array(z.string()).default([]),
  })).default([]) }) })

export const emergencyBlock = z.object({ ...base, type: z.literal('emergency'),
  props: z.object({ contacts: z.array(z.object({ label: z.string(), phone: z.string() })).default([]) }) })

export const heroBlock = z.object({ ...base, type: z.literal('hero'),
  props: z.object({ imageUrl: optionalMediaUrl, greeting: z.string(), propertyName: z.string() }) })

export const whatsappBlock = z.object({ ...base, type: z.literal('whatsapp'),
  props: z.object({ number: z.string(), message: z.string().optional() }) })

export const mapBlock = z.object({ ...base, type: z.literal('map'),
  props: z.object({ query: z.string(), label: z.string().optional() }) })

export const calloutBlock = z.object({ ...base, type: z.literal('callout'),
  props: z.object({
    variant: z.enum(['tip', 'info', 'warning']).default('tip'),
    icon: z.string().default('Lightbulb'),
    text: z.string(),
  }) })

export const accordionBlock = z.object({ ...base, type: z.literal('accordion'),
  props: z.object({
    items: z.array(z.object({
      icon: z.string().default('Info'),
      title: z.string(),
      summary: z.string().default(''),
      body: z.string().default(''),
    })).default([]),
  }) })

export const linkcardBlock = z.object({ ...base, type: z.literal('linkcard'),
  props: z.object({
    title: z.string(),
    text: z.string().default(''),
    links: z.array(z.object({
      label: z.string(),
      href: safeHref.or(z.literal('')),
    })).default([]),
  }) })

export const carouselBlock = z.object({ ...base, type: z.literal('carousel'),
  props: z.object({
    images: z.array(z.object({
      url: optionalMediaUrl,
      alt: z.string().default(''),
      caption: z.string().optional(),
    })).default([]),
  }) })

export const blockSchema = z.discriminatedUnion('type', [
  headingBlock, textBlock, imageBlock, buttonBlock, dividerBlock,
  wifiBlock, checkinBlock, checkoutBlock, rulesBlock, guideBlock,
  emergencyBlock, heroBlock, whatsappBlock, mapBlock, calloutBlock,
  accordionBlock, linkcardBlock, carouselBlock,
])

export const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  icon: z.string(),
  blocks: z.array(blockSchema),
})

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida')

export const pageTheme = z.object({
  preset: z.string(),
  colors: z.object({
    accent: hexColor,
    secondary: hexColor,
    background: hexColor,
  }).partial().optional(),
  headingFont: z.string().optional(),
  bodyFont: z.string().optional(),
}).optional()

export const pageContentSchema = z.object({
  nav: z.enum(['buttons', 'onepage']),
  sections: z.array(sectionSchema).min(1),
  theme: pageTheme,
})

export type Block = z.infer<typeof blockSchema>
export type Section = z.infer<typeof sectionSchema>
export type PageTheme = z.infer<typeof pageTheme>
export type PageContent = z.infer<typeof pageContentSchema>
export type BlockType = Block['type']

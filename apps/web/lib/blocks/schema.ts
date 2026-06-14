import { z } from 'zod'

const base = { id: z.string().min(1) }

export const headingBlock = z.object({ ...base, type: z.literal('heading'),
  props: z.object({ text: z.string(), level: z.union([z.literal(1), z.literal(2), z.literal(3)]) }) })

export const textBlock = z.object({ ...base, type: z.literal('text'),
  props: z.object({ text: z.string() }) }) // plain text, rendered whitespace-pre-wrap (no raw HTML — XSS-safe)

export const imageBlock = z.object({ ...base, type: z.literal('image'),
  props: z.object({ url: z.string().url(), alt: z.string().default(''), caption: z.string().optional() }) })

export const buttonBlock = z.object({ ...base, type: z.literal('button'),
  props: z.object({ label: z.string(), href: z.string(), kind: z.enum(['link', 'tel', 'whatsapp', 'map']).default('link') }) })

export const dividerBlock = z.object({ ...base, type: z.literal('divider'),
  props: z.object({ variant: z.enum(['line', 'spacer']).default('line') }) })

export const wifiBlock = z.object({ ...base, type: z.literal('wifi'),
  props: z.object({ ssid: z.string().min(1), password: z.string().min(1) }) })

export const checkinBlock = z.object({ ...base, type: z.literal('checkin'),
  props: z.object({ time: z.string(), address: z.string(), accessCode: z.string().optional(), instructions: z.string().default('') }) })

export const checkoutBlock = z.object({ ...base, type: z.literal('checkout'),
  props: z.object({ time: z.string(), items: z.array(z.string()).default([]) }) })

export const rulesBlock = z.object({ ...base, type: z.literal('rules'),
  props: z.object({ items: z.array(z.object({ icon: z.string(), label: z.string() })).default([]) }) })

export const guideBlock = z.object({ ...base, type: z.literal('guide'),
  props: z.object({ places: z.array(z.object({
    name: z.string(), blurb: z.string().default(''), distance: z.string().optional(), mapUrl: z.string().url().optional(),
  })).default([]) }) })

export const emergencyBlock = z.object({ ...base, type: z.literal('emergency'),
  props: z.object({ contacts: z.array(z.object({ label: z.string(), phone: z.string() })).default([]) }) })

export const heroBlock = z.object({ ...base, type: z.literal('hero'),
  props: z.object({ imageUrl: z.string().url().optional(), greeting: z.string(), propertyName: z.string() }) })

export const whatsappBlock = z.object({ ...base, type: z.literal('whatsapp'),
  props: z.object({ number: z.string(), message: z.string().optional() }) })

export const mapBlock = z.object({ ...base, type: z.literal('map'),
  props: z.object({ query: z.string(), label: z.string().optional() }) })

export const blockSchema = z.discriminatedUnion('type', [
  headingBlock, textBlock, imageBlock, buttonBlock, dividerBlock,
  wifiBlock, checkinBlock, checkoutBlock, rulesBlock, guideBlock,
  emergencyBlock, heroBlock, whatsappBlock, mapBlock,
])

export const sectionSchema = z.object({
  id: z.string().min(1),
  title: z.string(),
  icon: z.string(),
  blocks: z.array(blockSchema),
})

export const pageContentSchema = z.object({
  nav: z.enum(['buttons', 'onepage']),
  sections: z.array(sectionSchema),
})

export type Block = z.infer<typeof blockSchema>
export type Section = z.infer<typeof sectionSchema>
export type PageContent = z.infer<typeof pageContentSchema>
export type BlockType = Block['type']

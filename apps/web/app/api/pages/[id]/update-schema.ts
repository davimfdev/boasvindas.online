import { z } from 'zod'
import { pageContentSchema } from '@/lib/blocks/schema'

export const updateSchema = z.object({
  title:    z.string().min(2).max(100).optional(),
  subtitle: z.string().max(200).optional().nullable(),
  whatsapp: z.string().optional().nullable(),
  theme:    z.enum(['modern', 'rustic']).optional(),
  content:  pageContentSchema.optional(),
})

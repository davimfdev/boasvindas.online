import { Router } from 'express'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { pages } from '../db/schema.js'
import { updateSchema } from './update-schema.js'
import { generateSlug, isSlugReserved, isSlugValid } from '../utils/slug.js'
import { isUniqueViolation } from '../middleware/error.js'
import { requireAuth } from '../middleware/require-auth.js'

export const pagesRouter: Router = Router()

pagesRouter.use(requireAuth)

const createSchema = z.object({
  title:    z.string().min(2).max(100),
  slug:     z.string().optional(),
  whatsapp: z.string().optional(),
  theme:    z.enum(['modern', 'rustic']).default('modern'),
})

async function getOwned(id: string, userId: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, userId)))
    .limit(1)
  return page ?? null
}

pagesRouter.get('/', async (req, res) => {
  const userPages = await db
    .select()
    .from(pages)
    .where(eq(pages.userId, req.user!.id))
    .orderBy(pages.createdAt)
  res.status(200).json({ pages: userPages })
})

pagesRouter.post('/', async (req, res) => {
  try {
    const { title, slug: rawSlug, whatsapp, theme } = createSchema.parse(req.body)
    const slug = rawSlug?.trim() || generateSlug(title)

    if (isSlugReserved(slug)) {
      res.status(422).json({
        error: { code: 'SLUG_RESERVED', message: 'Este slug é reservado pelo sistema' },
      })
      return
    }
    if (!isSlugValid(slug)) {
      res.status(422).json({
        error: {
          code: 'SLUG_INVALID',
          message: 'Use letras minúsculas, números e hífens (ex: minha-suite)',
        },
      })
      return
    }

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1)

    if (existing) {
      res.status(409).json({
        error: { code: 'SLUG_TAKEN', message: 'Este slug já está em uso. Escolha outro.' },
      })
      return
    }

    const [page] = await db
      .insert(pages)
      .values({ userId: req.user!.id, slug, title, whatsapp: whatsapp || null, theme })
      .returning()

    res.status(201).json({ page })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION', message: err.issues[0]?.message } })
      return
    }
    if (isUniqueViolation(err)) {
      res.status(409).json({
        error: { code: 'SLUG_TAKEN', message: 'Este slug já está em uso. Escolha outro.' },
      })
      return
    }
    throw err
  }
})

pagesRouter.get('/:id', async (req, res) => {
  const page = await getOwned(req.params.id, req.user!.id)
  if (!page) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }
  res.status(200).json({ page })
})

pagesRouter.put('/:id', async (req, res) => {
  const page = await getOwned(req.params.id, req.user!.id)
  if (!page) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  try {
    const updates = updateSchema.parse(req.body)
    const [updated] = await db
      .update(pages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pages.id, req.params.id))
      .returning()
    res.status(200).json({ page: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION', message: err.issues[0]?.message } })
      return
    }
    throw err
  }
})

pagesRouter.delete('/:id', async (req, res) => {
  const page = await getOwned(req.params.id, req.user!.id)
  if (!page) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }
  await db.delete(pages).where(eq(pages.id, req.params.id))
  res.status(204).end()
})

pagesRouter.post('/:id/publish', async (req, res) => {
  const page = await getOwned(req.params.id, req.user!.id)
  if (!page) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  const newStatus = page.status === 'published' ? 'draft' : 'published'
  const [updated] = await db
    .update(pages)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(pages.id, req.params.id))
    .returning()

  res.status(200).json({ page: updated })
})

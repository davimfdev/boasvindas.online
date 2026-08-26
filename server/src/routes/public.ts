import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { db } from '../db/index.js'
import { pages } from '../db/schema.js'
import { resolvePageContent } from '../services/page-content.js'

export const publicRouter: Router = Router()

/**
 * Feeds the guest site, which renders in the browser. Unpublished pages return
 * only what the "em breve" placeholder needs — never the draft content itself.
 */
publicRouter.get('/pages/:slug', async (req, res) => {
  const [page] = await db
    .select()
    .from(pages)
    .where(eq(pages.slug, req.params.slug))
    .limit(1)

  if (!page) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  if (page.status !== 'published') {
    res.status(200).json({
      page: { slug: page.slug, title: page.title, theme: page.theme, status: page.status },
    })
    return
  }

  res.status(200).json({
    page: {
      slug:     page.slug,
      title:    page.title,
      subtitle: page.subtitle,
      theme:    page.theme,
      status:   page.status,
      whatsapp: page.whatsapp,
      content:  resolvePageContent(page.content),
    },
  })
})

import { cache } from 'react'
import { pages } from './schema'
import { pageContentSchema, type PageContent } from '@/lib/blocks/schema'
import { DEFAULT_TEMPLATE } from '@/lib/blocks/templates'

// Lazy backfill: any row without valid content renders the default template.
// Avoids seeding production data inside a migration (.claude/rules/database.md).
export function resolvePageContent(content: unknown): PageContent {
  const parsed = pageContentSchema.safeParse(content)
  return parsed.success ? parsed.data : DEFAULT_TEMPLATE
}

export const getPageBySlug = cache(async (slug: string) => {
  // NOTE: lazy imports avoid eager DATABASE_URL guard during module evaluation
  const { db } = await import('./index')
  const { eq } = await import('drizzle-orm')
  try {
    const [page] = await db.select().from(pages).where(eq(pages.slug, slug)).limit(1)
    if (!page) return null
    return { ...page, content: resolvePageContent(page.content) }
  } catch (err) {
    throw new Error(`Failed to load page for slug "${slug}"`, { cause: err })
  }
})

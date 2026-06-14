import { eq, and } from 'drizzle-orm'
import { pages } from './schema'
import { pageContentSchema, type PageContent } from '@/lib/blocks/schema'
import { DEFAULT_TEMPLATE } from '@/lib/blocks/templates'

// Lazy backfill: any row without valid content renders the default template.
// Avoids seeding production data inside a migration (.claude/rules/database.md).
export function resolvePageContent(content: unknown): PageContent {
  const parsed = pageContentSchema.safeParse(content)
  return parsed.success ? parsed.data : DEFAULT_TEMPLATE
}

export async function getPublishedPageBySlug(slug: string) {
  // NOTE: lazy import avoids eager DATABASE_URL guard during module evaluation
  const { db } = await import('./index')
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.slug, slug), eq(pages.status, 'published')))
    .limit(1)
  if (!page) return null
  return { ...page, content: resolvePageContent(page.content) }
}

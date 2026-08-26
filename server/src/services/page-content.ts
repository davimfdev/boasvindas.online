import { pageContentSchema, type PageContent } from '../lib/blocks/schema.js'
import { DEFAULT_TEMPLATE } from '../lib/blocks/templates.js'

/**
 * Lazy backfill: any row without valid content renders the default template.
 * Avoids seeding production data inside a migration.
 */
export function resolvePageContent(content: unknown): PageContent {
  const parsed = pageContentSchema.safeParse(content)
  return parsed.success ? parsed.data : DEFAULT_TEMPLATE
}

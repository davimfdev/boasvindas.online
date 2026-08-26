import { pageContentSchema, type PageContent } from './schema'
import { DEFAULT_TEMPLATE } from './templates'

/** Mirrors the API fallback: invalid or missing content renders the default template. */
export function resolvePageContent(content: unknown): PageContent {
  const parsed = pageContentSchema.safeParse(content)
  return parsed.success ? parsed.data : DEFAULT_TEMPLATE
}

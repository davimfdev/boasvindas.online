import type { PageContent } from '@/lib/blocks/schema'

/** Shape returned by /api/pages for the page owner. */
export interface HostPage {
  id: string
  userId: string
  slug: string
  title: string
  subtitle: string | null
  status: string
  theme: string
  content: PageContent | null
  whatsapp: string | null
  createdAt: string | null
  updatedAt: string | null
}

/** Shape returned by /api/public/pages/:slug. Content is absent while unpublished. */
export interface PublicPage {
  slug: string
  title: string
  subtitle?: string | null
  status: string
  theme: string
  whatsapp?: string | null
  content?: PageContent
}

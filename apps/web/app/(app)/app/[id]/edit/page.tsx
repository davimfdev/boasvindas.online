import { notFound, redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { resolvePageContent } from '@/lib/db/queries'
import { Builder } from './_builder/Builder'

export default async function EditPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) redirect('/login')
  const { id } = await params
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, session.user.id)))
    .limit(1)
  if (!page) notFound()
  return (
    <Builder
      pageId={page.id}
      title={page.title}
      whatsapp={page.whatsapp}
      theme={page.theme}
      slug={page.slug}
      initialContent={resolvePageContent(page.content)}
    />
  )
}

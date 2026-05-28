import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  const { id } = await params
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, session.user.id)))
    .limit(1)

  if (!page) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })

  const newStatus = page.status === 'published' ? 'draft' : 'published'
  const [updated] = await db
    .update(pages)
    .set({ status: newStatus, updatedAt: new Date() })
    .where(eq(pages.id, id))
    .returning()

  revalidatePath(`/${page.slug}`)

  return NextResponse.json({ page: updated })
}

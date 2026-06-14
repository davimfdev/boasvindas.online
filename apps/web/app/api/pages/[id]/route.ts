import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { and, eq } from 'drizzle-orm'
import { z } from 'zod'
import { updateSchema } from './update-schema'

async function getOwned(id: string, userId: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, userId)))
    .limit(1)
  return page ?? null
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }
  const { id } = await params
  const page = await getOwned(id, session.user.id)
  if (!page) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  return NextResponse.json({ page })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }
  const { id } = await params
  const page = await getOwned(id, session.user.id)
  if (!page) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })

  try {
    const updates = updateSchema.parse(await req.json())
    const [updated] = await db
      .update(pages)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(pages.id, id))
      .returning()
    return NextResponse.json({ page: updated })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: err.issues[0].message } },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }
  const { id } = await params
  const page = await getOwned(id, session.user.id)
  if (!page) return NextResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 })
  await db.delete(pages).where(eq(pages.id, id))
  return new NextResponse(null, { status: 204 })
}

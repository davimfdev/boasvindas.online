import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { pages } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { generateSlug, isSlugReserved, isSlugValid } from '@/lib/utils'

const createSchema = z.object({
  title:    z.string().min(2).max(100),
  slug:     z.string().optional(),
  whatsapp: z.string().optional(),
  theme:    z.enum(['modern', 'rustic']).default('modern'),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }
  const userPages = await db
    .select()
    .from(pages)
    .where(eq(pages.userId, session.user.id))
    .orderBy(pages.createdAt)
  return NextResponse.json({ pages: userPages })
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED' } }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { title, slug: rawSlug, whatsapp, theme } = createSchema.parse(body)
    const slug = rawSlug?.trim() || generateSlug(title)

    if (isSlugReserved(slug)) {
      return NextResponse.json(
        { error: { code: 'SLUG_RESERVED', message: 'Este slug é reservado pelo sistema' } },
        { status: 422 }
      )
    }
    if (!isSlugValid(slug)) {
      return NextResponse.json(
        { error: { code: 'SLUG_INVALID', message: 'Use letras minúsculas, números e hífens (ex: minha-suite)' } },
        { status: 422 }
      )
    }

    const [existing] = await db
      .select({ id: pages.id })
      .from(pages)
      .where(eq(pages.slug, slug))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: { code: 'SLUG_TAKEN', message: 'Este slug já está em uso. Escolha outro.' } },
        { status: 409 }
      )
    }

    const [page] = await db
      .insert(pages)
      .values({ userId: session.user.id, slug, title, whatsapp: whatsapp || null, theme })
      .returning()

    return NextResponse.json({ page }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: err.issues[0].message } },
        { status: 400 }
      )
    }
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json(
        { error: { code: 'SLUG_TAKEN', message: 'Este slug já está em uso. Escolha outro.' } },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 })
  }
}

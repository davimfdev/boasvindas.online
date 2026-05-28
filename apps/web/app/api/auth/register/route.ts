import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

const schema = z.object({
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  pwd:   z.string().min(8),
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, pwd } = schema.parse({
      name:  body.name,
      email: body.email,
      pwd:   body.password,
    })

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'Email já cadastrado' } },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(pwd, 12)
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hash })
      .returning({ id: users.id, email: users.email })

    return NextResponse.json({ user }, { status: 201 })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: { code: 'VALIDATION', message: err.issues[0].message } },
        { status: 400 }
      )
    }
    // Postgres unique violation (concurrent registration race)
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === '23505') {
      return NextResponse.json(
        { error: { code: 'EMAIL_EXISTS', message: 'Email já cadastrado' } },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: { code: 'INTERNAL' } }, { status: 500 })
  }
}

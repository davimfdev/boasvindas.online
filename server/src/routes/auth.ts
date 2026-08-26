import { Router } from 'express'
import { eq } from 'drizzle-orm'
import { z } from 'zod'
import { db } from '../db/index.js'
import { users } from '../db/schema.js'
import { hashPassword, verifyPassword } from '../services/password.js'
import {
  clearSessionCookie,
  setSessionCookie,
  signSessionToken,
} from '../services/session.js'
import { isUniqueViolation } from '../middleware/error.js'

export const authRouter: Router = Router()

const registerSchema = z.object({
  name:  z.string().min(2).max(100),
  email: z.string().email(),
  pwd:   z.string().min(8),
})

const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

authRouter.post('/register', async (req, res) => {
  try {
    const { name, email, pwd } = registerSchema.parse({
      name:  req.body?.name,
      email: req.body?.email,
      pwd:   req.body?.password,
    })

    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1)

    if (existing) {
      res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'Email já cadastrado' } })
      return
    }

    const hash = await hashPassword(pwd)
    const [user] = await db
      .insert(users)
      .values({ name, email, passwordHash: hash })
      .returning({ id: users.id, email: users.email })

    res.status(201).json({ user })
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ error: { code: 'VALIDATION', message: err.issues[0]?.message } })
      return
    }
    // Concurrent registration with the same email.
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: { code: 'EMAIL_EXISTS', message: 'Email já cadastrado' } })
      return
    }
    throw err
  }
})

authRouter.post('/login', async (req, res) => {
  const parsed = loginSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(401).json({ error: { code: 'CREDENTIALS', message: 'Email ou senha incorretos' } })
    return
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, parsed.data.email))
    .limit(1)

  // Runs bcrypt even when the email is unknown, so timing cannot reveal accounts.
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash)
  if (!user || !valid) {
    res.status(401).json({ error: { code: 'CREDENTIALS', message: 'Email ou senha incorretos' } })
    return
  }

  const sessionUser = { id: user.id, email: user.email, name: user.name }
  setSessionCookie(res, await signSessionToken(sessionUser))
  res.status(200).json({ user: sessionUser })
})

authRouter.post('/logout', (_req, res) => {
  clearSessionCookie(res)
  res.status(204).end()
})

authRouter.get('/session', (req, res) => {
  res.status(200).json({ user: req.user ?? null })
})

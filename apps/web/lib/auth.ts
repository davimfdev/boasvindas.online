import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { users } from '@/lib/db/schema'
import { eq } from 'drizzle-orm'
import bcrypt from 'bcryptjs'

if (!process.env.AUTH_SECRET) {
  throw new Error('AUTH_SECRET environment variable is not set')
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email as string
        const pwd = credentials?.password as string
        if (!email || !pwd) return null

        const [user] = await db
          .select({ id: users.id, email: users.email, name: users.name, passwordHash: users.passwordHash })
          .from(users)
          .where(eq(users.email, email))
          .limit(1)

        // Always run bcrypt to prevent timing-based email enumeration
        const DUMMY = '$2a$12$LCKVGPkZasFme5oXALhh6ubFv4B.0KBaseFXnPT9aMRRNGnWxLcKm'
        const hash = user?.passwordHash ?? DUMMY
        const valid = await bcrypt.compare(pwd, hash)

        if (!user || !valid) return null
        return { id: user.id, email: user.email, name: user.name }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) token.id = user.id
      return token
    },
    session({ session, token }) {
      if (session.user) session.user.id = token.id as string
      return session
    },
  },
  pages: { signIn: '/login' },
})

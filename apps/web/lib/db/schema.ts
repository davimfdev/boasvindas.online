import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').unique().notNull(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  plan:         text('plan').notNull().default('free'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
})

export const pages = pgTable('pages', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  slug:      text('slug').unique().notNull(),
  title:     text('title').notNull(),
  subtitle:  text('subtitle'),
  status:    text('status').notNull().default('draft'),
  theme:     text('theme').notNull().default('modern'),
  whatsapp:  text('whatsapp'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('pages_user_id_idx').on(t.userId),
])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert

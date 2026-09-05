import { sql } from 'drizzle-orm'
import { check, index, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'
import type { PageContent } from '../lib/blocks/schema.js'

export const users = pgTable('users', {
  id:           uuid('id').primaryKey().defaultRandom(),
  email:        text('email').unique().notNull(),
  name:         text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  plan:         text('plan').notNull().default('free'),
  createdAt:    timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  // The application normalises on the way in; this is what makes it an
  // invariant rather than a convention. With every row canonical, the existing
  // UNIQUE(email) is already the case-insensitive uniqueness we want -- no
  // functional index and no citext needed.
  //
  // The whitespace set is spelled out character by character on purpose. `\s`
  // and the POSIX classes resolve through the database collation, so what they
  // cover changes with the environment: on the production server they do not
  // match NBSP, which migration 0005 assumed they would. `btrim` with an
  // explicit set matches exact characters and behaves the same everywhere.
  // `chr()` keeps the invisible ones out of the source. See migrations/0006.
  check(
    'users_email_canonical',
    sql`${t.email} = lower(btrim(${t.email}, E' \\t\\n\\r\\v\\f' || chr(160) || chr(65279)))`,
  ),
])

export const pages = pgTable('pages', {
  id:        uuid('id').primaryKey().defaultRandom(),
  userId:    uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  slug:      text('slug').unique().notNull(),
  title:     text('title').notNull(),
  subtitle:  text('subtitle'),
  status:    text('status').notNull().default('draft'),
  theme:     text('theme').notNull().default('modern'),
  content:   jsonb('content').$type<PageContent>(),
  whatsapp:  text('whatsapp'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('pages_user_id_idx').on(t.userId),
])

/** One stored file per rendered width, produced by services/image-pipeline. */
export interface MediaVariant {
  width: number
  file: string
  sizeBytes: number
}

export const media = pgTable('media', {
  id:        uuid('id').primaryKey().defaultRandom(),
  pageId:    uuid('page_id').references(() => pages.id, { onDelete: 'cascade' }).notNull(),
  /** The widest variant: what `GET /api/media/:id` serves without a `w` query. */
  filename:  text('filename').notNull(),
  mimeType:  text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  width:     integer('width'),
  height:    integer('height'),
  variants:  jsonb('variants').$type<MediaVariant[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (t) => [
  index('media_page_id_idx').on(t.pageId),
])

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Page = typeof pages.$inferSelect
export type NewPage = typeof pages.$inferInsert
export type Media = typeof media.$inferSelect
export type NewMedia = typeof media.$inferInsert

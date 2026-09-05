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
  // UNIQUE(email) is already the case-insensitive uniqueness we want — no
  // functional index and no citext needed.
  //
  // Not `btrim`: with one argument it strips only the ASCII space, so a raw
  // insert padded with TAB, CR, LF or NBSP would slip past while the
  // application's `trim()` would have removed it. `\s` covers those and the
  // Unicode separators. See migrations/0005 for the one codepoint it does not.
  check(
    'users_email_canonical',
    // The backslashes are doubled because a tagged template hands Drizzle the
    // cooked string: `\s` would arrive as a bare `s` and the regex would strip
    // the letter instead of whitespace.
    sql`${t.email} = lower(regexp_replace(${t.email}, '^\\s+|\\s+$', '', 'g'))`,
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

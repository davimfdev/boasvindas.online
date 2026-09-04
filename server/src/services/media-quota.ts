/**
 * How much stored image data an account holds, and the ceiling it may not pass.
 *
 * The number is derived from the media rows the user owns rather than from the
 * volume: files left behind by an interrupted delete are not the user's to pay
 * for, and the database is the only source both the API and a future invoice
 * can agree on.
 */

import { eq } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import { media, pages, type MediaVariant } from '../db/schema.js'
import type * as schema from '../db/schema.js'

/** Accepts the pool or a transaction, so the caller decides the lock scope. */
type Queryable = Pick<PostgresJsDatabase<typeof schema>, 'select'>

export class QuotaExceededError extends Error {
  constructor() {
    super('media storage quota exceeded')
    this.name = 'QuotaExceededError'
  }
}

/** The byte counts a media row carries, whatever pipeline wrote it. */
export interface StoredMedia {
  sizeBytes: number
  variants: MediaVariant[] | null
}

/**
 * Bytes one row occupies.
 *
 * Every rendered width is a separate object on disk, so the row's own
 * `sizeBytes` — which records the widest variant alone — understates the
 * footprint by a fifth to a third. Rows written before the pipeline existed
 * carry no variants and are the single file `sizeBytes` does describe.
 */
export function storedBytesOf(row: StoredMedia): number {
  if (!row.variants?.length) return row.sizeBytes
  return row.variants.reduce((total, variant) => total + variant.sizeBytes, 0)
}

export function totalStoredBytes(rows: StoredMedia[]): number {
  return rows.reduce((total, row) => total + storedBytesOf(row), 0)
}

/**
 * Every media row the user owns, reached through the page that holds it. Draft
 * and published pages count alike: both keep their files on the volume.
 */
export async function usedBytesForUser(tx: Queryable, userId: string): Promise<number> {
  const rows = await tx
    .select({ sizeBytes: media.sizeBytes, variants: media.variants })
    .from(media)
    .innerJoin(pages, eq(media.pageId, pages.id))
    .where(eq(pages.userId, userId))

  return totalStoredBytes(rows)
}

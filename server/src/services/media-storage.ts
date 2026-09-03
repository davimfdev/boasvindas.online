/**
 * The only module that touches the bytes of an uploaded image.
 *
 * Today it writes to a directory on the container filesystem (a persistent
 * volume in production). Swapping to an S3-compatible bucket means reimplementing
 * these three functions and nothing else: no caller knows a path exists.
 */

import { randomUUID } from 'node:crypto'
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { config } from '../config.js'

export class MediaNotFoundError extends Error {
  constructor() {
    super('media object not found')
    this.name = 'MediaNotFoundError'
  }
}

/** Shape of every name this module hands out. Anything else is refused. */
const STORED_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.[a-z0-9]{2,5}$/

/**
 * Writes bytes under a freshly generated name and returns it. The client's own
 * filename never reaches this module, so no request can steer the path.
 */
export async function saveMedia(bytes: Buffer, extension: string): Promise<string> {
  const filename = `${randomUUID()}.${extension}`
  await mkdir(config.mediaDir, { recursive: true })
  await writeFile(resolveStored(filename), bytes)
  return filename
}

/**
 * Images are capped at a few megabytes, so buffering is simpler than streaming
 * and maps directly onto an object-store `getObject` later.
 */
export async function readMedia(filename: string): Promise<Buffer> {
  try {
    return await readFile(resolveStored(filename))
  } catch {
    throw new MediaNotFoundError()
  }
}

/** Removing an object that is already gone is success, not an error. */
export async function deleteMedia(filename: string): Promise<void> {
  try {
    await unlink(resolveStored(filename))
  } catch {
    // Nothing to remove.
  }
}

/**
 * Second line of defence behind the generated name: even a tampered database row
 * cannot escape the media directory.
 */
function resolveStored(filename: string): string {
  if (!STORED_NAME.test(filename)) throw new MediaNotFoundError()
  return path.join(config.mediaDir, filename)
}

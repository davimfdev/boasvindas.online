import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, describe, expect, it, vi } from 'vitest'

/**
 * A real write creates the object and only then fills it, so an interrupted one
 * leaves a truncated file behind. Filling a disk on demand is not deterministic,
 * so writeFile is stubbed to reproduce exactly that — and only while a test arms
 * it. Unarmed, every call goes to the real filesystem like the rest of the file.
 */
const { armWriteFailure, isWriteFailureArmed } = vi.hoisted(() => {
  let armed = false
  return {
    armWriteFailure: (next: boolean) => { armed = next },
    isWriteFailureArmed: () => armed,
  }
})

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    default: actual,
    writeFile: async (file: string, data: Buffer) => {
      if (!isWriteFailureArmed()) return actual.writeFile(file, data)
      await actual.writeFile(file, data.subarray(0, 3))
      throw Object.assign(new Error('no space left on device'), { code: 'ENOSPC' })
    },
  }
})

// The filesystem is the boundary under test, so it runs for real against a
// throwaway directory instead of being mocked.
const MEDIA_DIR = mkdtempSync(path.join(os.tmpdir(), 'bv-storage-'))
process.env.MEDIA_DIR = MEDIA_DIR

const { deleteMedia, MediaNotFoundError, readMedia, saveMedia } = await import('../media-storage.js')

const BYTES = Buffer.from('conteudo-da-imagem')

afterEach(() => {
  armWriteFailure(false)
})

afterAll(() => {
  rmSync(MEDIA_DIR, { recursive: true, force: true })
})

describe('media storage', () => {
  it('writes the bytes under the name it returns', async () => {
    const filename = await saveMedia(BYTES, 'png')
    expect(readFileSync(path.join(MEDIA_DIR, filename)).equals(BYTES)).toBe(true)
  })

  it('reads back exactly what was written', async () => {
    const filename = await saveMedia(BYTES, 'webp')
    expect((await readMedia(filename)).equals(BYTES)).toBe(true)
  })

  it('gives every upload a distinct name', async () => {
    const first = await saveMedia(BYTES, 'png')
    const second = await saveMedia(BYTES, 'png')
    expect(first).not.toBe(second)
  })

  it('refuses a name that tries to climb out of the media directory', async () => {
    await expect(readMedia('../../etc/passwd')).rejects.toBeInstanceOf(MediaNotFoundError)
  })

  it('reports a missing object as not found', async () => {
    await expect(readMedia('44444444-4444-4444-4444-444444444444.png')).rejects.toBeInstanceOf(MediaNotFoundError)
  })

  it('treats deleting an absent object as done', async () => {
    await expect(deleteMedia('44444444-4444-4444-4444-444444444444.png')).resolves.toBeUndefined()
  })

  it('reports the original failure when the write breaks', async () => {
    armWriteFailure(true)
    await expect(saveMedia(BYTES, 'webp')).rejects.toThrow('no space left on device')
  })

  // The name is generated in saveMedia and never returned on this path, so a
  // file left here is one no caller could ever remove.
  it('leaves no truncated object behind when the write breaks', async () => {
    const before = readdirSync(MEDIA_DIR).length
    armWriteFailure(true)
    await saveMedia(BYTES, 'webp').catch(() => {})
    expect(readdirSync(MEDIA_DIR).length).toBe(before)
  })
})

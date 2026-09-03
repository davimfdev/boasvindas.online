import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'

// The filesystem is the boundary under test, so it runs for real against a
// throwaway directory instead of being mocked.
const MEDIA_DIR = mkdtempSync(path.join(os.tmpdir(), 'bv-storage-'))
process.env.MEDIA_DIR = MEDIA_DIR

const { deleteMedia, MediaNotFoundError, readMedia, saveMedia } = await import('../media-storage.js')

const BYTES = Buffer.from('conteudo-da-imagem')

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
})

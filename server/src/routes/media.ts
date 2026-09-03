import { Router, type NextFunction, type Request, type Response } from 'express'
import { and, eq } from 'drizzle-orm'
import multer from 'multer'
import { z } from 'zod'
import { config } from '../config.js'
import { db } from '../db/index.js'
import { media, pages, type MediaVariant } from '../db/schema.js'
import { requireAuth } from '../middleware/require-auth.js'
import { deleteMedia, MediaNotFoundError, readMedia, saveMedia } from '../services/media-storage.js'
import { processImage, type ProcessedImage } from '../services/image-pipeline.js'

export const mediaRouter: Router = Router()

/** Everything is re-encoded on the way in, so one type covers every stored object. */
const SERVED_MIME_TYPE = 'image/webp'

/** The four formats every current browser renders, and nothing executable. */
const ACCEPTED = [
  { mimeType: 'image/jpeg', extension: 'jpg' },
  { mimeType: 'image/png', extension: 'png' },
  { mimeType: 'image/webp', extension: 'webp' },
  { mimeType: 'image/avif', extension: 'avif' },
] as const

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const uploadSchema = z.object({
  pageId: z.string().regex(UUID, 'Informe a página que recebe a imagem'),
})

// Files are held in memory: media-storage decides where the bytes end up, and
// multer never gets to write a path of its own.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.mediaMaxBytes, files: 1, fields: 4 },
})

const maxMegabytes = Math.round(config.mediaMaxBytes / (1024 * 1024))

mediaRouter.post('/upload', requireAuth, receiveFile, async (req, res) => {
  const file = req.file
  if (!file) {
    res.status(400).json({ error: { code: 'VALIDATION', message: 'Selecione uma imagem para enviar' } })
    return
  }

  const { pageId } = uploadSchema.parse(req.body)

  const [page] = await db
    .select({ id: pages.id })
    .from(pages)
    .where(and(eq(pages.id, pageId), eq(pages.userId, req.user!.id)))
    .limit(1)

  if (!page) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  // The browser's Content-Type is a claim; the leading bytes are the evidence.
  const detected = detectImageType(file.buffer)
  if (!detected) {
    res.status(415).json({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Envie uma imagem JPG, PNG, WebP ou AVIF' },
    })
    return
  }

  // Magic bytes only proved it claims to be an image; decoding proves it is one.
  let processed: ProcessedImage
  try {
    processed = await processImage(file.buffer)
  } catch {
    res.status(415).json({
      error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Não foi possível processar esta imagem' },
    })
    return
  }

  const variants: MediaVariant[] = []
  for (const variant of processed.variants) {
    variants.push({
      width: variant.width,
      file: await saveMedia(variant.bytes, 'webp'),
      sizeBytes: variant.bytes.length,
    })
  }

  const widest = variants[variants.length - 1]
  const [row] = await db
    .insert(media)
    .values({
      pageId,
      filename: widest.file,
      mimeType: SERVED_MIME_TYPE,
      sizeBytes: widest.sizeBytes,
      width: processed.width,
      height: processed.height,
      variants,
    })
    .returning({ id: media.id })

  res.status(201).json({
    media: {
      id: row.id,
      url: `/api/media/${row.id}`,
      mimeType: SERVED_MIME_TYPE,
      sizeBytes: widest.sizeBytes,
      width: processed.width,
      height: processed.height,
      widths: variants.map((v) => v.width),
    },
  })
})

// Guest pages are public, so serving an image must never depend on a session.
mediaRouter.get('/:id', async (req, res) => {
  if (!UUID.test(req.params.id)) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  const [row] = await db
    .select({
      filename: media.filename,
      mimeType: media.mimeType,
      variants: media.variants,
    })
    .from(media)
    .where(eq(media.id, req.params.id))
    .limit(1)

  if (!row) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  let bytes: Buffer
  try {
    bytes = await readMedia(pickVariant(row.variants, row.filename, req.query.w))
  } catch (err) {
    if (err instanceof MediaNotFoundError) {
      res.status(404).json({ error: { code: 'NOT_FOUND' } })
      return
    }
    throw err
  }

  // A stored object is never rewritten — a new upload gets a new id and URL.
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
  res.setHeader('Content-Type', row.mimeType)
  res.status(200).send(bytes)
})

// NOTE: the route pattern is pinned as a type argument because Express 5 widens
// req.params to string | string[] when a path is given more than one handler.
mediaRouter.delete<'/:id'>('/:id', requireAuth, async (req, res) => {
  if (!UUID.test(req.params.id)) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  const [row] = await db
    .select({ filename: media.filename, variants: media.variants })
    .from(media)
    .innerJoin(pages, eq(media.pageId, pages.id))
    .where(and(eq(media.id, req.params.id), eq(pages.userId, req.user!.id)))
    .limit(1)

  if (!row) {
    res.status(404).json({ error: { code: 'NOT_FOUND' } })
    return
  }

  await db.delete(media).where(eq(media.id, req.params.id))

  // Every width is a separate object; leaving any behind orphans bytes forever.
  const files = new Set([row.filename, ...(row.variants ?? []).map((v) => v.file)])
  for (const file of files) await deleteMedia(file)

  res.status(204).end()
})

/**
 * Resolves `?w=` to a stored file. Only widths this upload actually produced are
 * reachable — the parameter selects among existing objects and never triggers a
 * resize, so no request can make the server do arbitrary image work.
 *
 * Rows written before the pipeline existed carry no variants and always serve
 * their single stored file.
 */
function pickVariant(
  variants: MediaVariant[] | null,
  fallback: string,
  requested: unknown,
): string {
  if (!variants?.length) return fallback
  const width = Number(requested)
  if (!Number.isInteger(width)) return fallback

  const match = variants.find((v) => v.width === width)
  if (match) return match.file

  // Asked for something we don't have: the closest width that is not smaller,
  // and the widest we own when the request is above everything stored.
  const larger = variants.filter((v) => v.width > width).sort((a, b) => a.width - b.width)[0]
  return (larger ?? variants[variants.length - 1]).file
}

/**
 * Multer reports an oversized upload as an error rather than a value, so its
 * failures are translated into the API envelope before they reach the route.
 */
function receiveFile(req: Request, res: Response, next: NextFunction) {
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next()
      return
    }
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: `A imagem deve ter no máximo ${maxMegabytes} MB` },
      })
      return
    }
    res.status(400).json({
      error: { code: 'VALIDATION', message: 'Não foi possível ler o arquivo enviado' },
    })
  })
}

/** Recognises a format by its magic bytes; returns null for everything else. */
function detectImageType(bytes: Buffer): (typeof ACCEPTED)[number] | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return ACCEPTED[0]
  }
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return ACCEPTED[1]
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    return ACCEPTED[2]
  }
  if (bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(bytes.toString('ascii', 8, 12))) {
    return ACCEPTED[3]
  }
  return null
}

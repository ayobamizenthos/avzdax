const { requireSession } = require('../_lib/auth')
const { storageConfigured, listMedia, saveMedia, deleteMedia } = require('../_lib/store')

const MAX_BYTES = 4 * 1024 * 1024
const ALLOWED_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif']

const EXTENSIONS = {
  'image/webp': 'webp',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/avif': 'avif'
}

const safeName = (name, contentType) => {
  const base = String(name || 'image')
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${base || 'image'}.${EXTENSIONS[contentType]}`
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireSession(req, res)) return

  if (!storageConfigured()) {
    return res.status(503).json({ error: 'Storage is not connected yet. Create a Blob store in Vercel and redeploy.' })
  }

  try {
    if (req.method === 'GET') {
      return res.status(200).json({ media: await listMedia() })
    }

    if (req.method === 'POST') {
      const { name, dataUrl } = req.body || {}
      const match = String(dataUrl || '').match(/^data:([a-z/+.-]+);base64,(.+)$/i)

      if (!match) return res.status(400).json({ error: 'That file could not be read' })

      const [, contentType, encoded] = match
      if (!ALLOWED_TYPES.includes(contentType)) {
        return res.status(400).json({ error: 'Images only — JPG, PNG, WebP, GIF or AVIF' })
      }

      const bytes = Buffer.from(encoded, 'base64')
      if (bytes.length > MAX_BYTES) {
        return res.status(413).json({ error: 'That image is too large. Keep it under 4MB.' })
      }

      const url = await saveMedia(safeName(name, contentType), bytes, contentType)
      return res.status(200).json({ url })
    }

    if (req.method === 'DELETE') {
      const url = req.query.url
      if (!url || !/^https:\/\/[a-z0-9-]+\.public\.blob\.vercel-storage\.com\//i.test(url)) {
        return res.status(400).json({ error: 'Unknown image' })
      }
      await deleteMedia(url)
      return res.status(200).json({ ok: true })
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (error) {
    console.error('Newsroom media failed:', error.message)
    return res.status(500).json({ error: 'Could not handle that image' })
  }
}

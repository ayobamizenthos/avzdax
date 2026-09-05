const { requireSession } = require('../_lib/auth')
const { storageConfigured, readIndex, savePost } = require('../_lib/store')

const seed = require('../_lib/seed/newsroom.json')

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireSession(req, res)) return

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  if (!storageConfigured()) {
    return res.status(503).json({ error: 'Storage is not connected yet. Create a Blob store in Vercel and redeploy.' })
  }

  try {
    const existing = await readIndex()
    if (existing.length) {
      return res.status(409).json({ error: 'There are already posts here. Import is only for an empty newsroom.' })
    }

    for (const post of seed) {
      await savePost(post)
    }

    return res.status(200).json({ imported: seed.length })
  } catch (error) {
    console.error('Newsroom import failed:', error.message)
    return res.status(500).json({ error: 'Could not bring the old entries in.' })
  }
}

const { requireSession } = require('../_lib/auth')
const { isSafeSlug } = require('../_lib/content')
const { storageConfigured, reorder } = require('../_lib/store')

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

  const slugs = (req.body || {}).slugs
  if (!Array.isArray(slugs) || !slugs.every(isSafeSlug)) {
    return res.status(400).json({ error: 'That ordering is not valid' })
  }

  try {
    const moved = await reorder(slugs)
    return res.status(200).json({ ok: true, ordered: moved })
  } catch (error) {
    console.error('Newsroom reorder failed:', error.message)
    return res.status(500).json({ error: 'Could not save the new order' })
  }
}

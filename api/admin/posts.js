const { requireSession } = require('../_lib/auth')
const { normalise, isSafeSlug } = require('../_lib/content')
const { storageConfigured, readIndex, readPost, savePost, deletePost } = require('../_lib/store')

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (!requireSession(req, res)) return

  if (!storageConfigured()) {
    return res.status(503).json({ error: 'Storage is not connected yet. Create a Blob store in Vercel and redeploy.' })
  }

  const slug = req.query.slug

  try {
    if (req.method === 'GET') {
      if (slug) {
        if (!isSafeSlug(slug)) return res.status(400).json({ error: 'Unknown post' })
        const post = await readPost(slug, { fresh: true })
        return post ? res.status(200).json(post) : res.status(404).json({ error: 'Not found' })
      }
      return res.status(200).json({ posts: await readIndex({ fresh: true }) })
    }

    if (req.method === 'POST') {
      const input = req.body || {}
      const existing = isSafeSlug(input.slug) ? await readPost(input.slug, { fresh: true }) : null
      const { errors, post } = normalise(input, existing)

      if (errors) return res.status(400).json({ error: errors.join(' ') })

      if (!existing) {
        const index = await readIndex({ fresh: true })
        if (index.some((card) => card.slug === post.slug)) {
          return res.status(409).json({ error: 'A post with that title already exists. Change the title slightly.' })
        }
        post.position = index.length
      }

      const saved = await savePost(post)
      return res.status(200).json({ post: saved })
    }

    if (req.method === 'DELETE') {
      if (!isSafeSlug(slug)) return res.status(400).json({ error: 'Unknown post' })
      const removed = await deletePost(slug)
      return removed ? res.status(200).json({ ok: true }) : res.status(404).json({ error: 'Not found' })
    }

    res.setHeader('Allow', 'GET, POST, DELETE')
    return res.status(405).json({ error: 'Method Not Allowed' })
  } catch (error) {
    console.error('Newsroom write failed:', error.message)
    return res.status(500).json({ error: 'Could not save. Try again.' })
  }
}

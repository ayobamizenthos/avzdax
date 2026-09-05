const { readIndex, readPost, toCard } = require('./_lib/store')

// Until the store is seeded — or if it is ever unreachable — the newsroom falls back to
// the entries shipped with the deployment so the page is never empty.
const bundled = require('./_lib/seed/newsroom.json')
const bundledCards = bundled.filter((post) => post.status === 'published').map(toCard)
const bundledBySlug = new Map(bundled.map((post) => [post.slug, post]))

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method Not Allowed' })
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=300')

  try {
    const { slug, category } = req.query

    if (slug) {
      // A miss only falls back while the store is unseeded. Once it holds entries it is
      // the single source of truth, so a deleted post stays deleted.
      let post = await readPost(slug)
      if (!post && !(await readIndex()).length) post = bundledBySlug.get(slug)

      if (!post || post.status !== 'published') {
        return res.status(404).json({ error: 'Not found' })
      }
      return res.status(200).json(post)
    }

    const stored = (await readIndex()).filter((card) => card.status === 'published')
    const published = stored.length ? stored : bundledCards
    const cards = category && category !== 'all'
      ? published.filter((card) => card.category === category)
      : published

    return res.status(200).json({ posts: cards })
  } catch (error) {
    console.error('Newsroom read failed, serving bundled entries:', error.message)
    return res.status(200).json({ posts: bundledCards })
  }
}

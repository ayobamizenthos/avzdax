const { readIndex } = require('./_lib/store')

const SITE = 'https://www.avzdax.com'

const bundled = require('./_lib/seed/newsroom.json')
const bundledCards = bundled.filter((post) => post.status === 'published')

const escapeXml = (value) =>
  String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const entry = (card) => {
  const modified = card.updatedAt ? `\n    <lastmod>${card.updatedAt.slice(0, 10)}</lastmod>` : ''
  return `  <url>\n    <loc>${escapeXml(SITE + '/news/' + card.slug)}</loc>${modified}\n    <priority>0.7</priority>\n  </url>`
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).send('Method Not Allowed')
  }

  res.setHeader('Content-Type', 'application/xml; charset=utf-8')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400')

  let cards
  try {
    const stored = (await readIndex()).filter((card) => card.status === 'published')
    cards = stored.length ? stored : bundledCards
  } catch (error) {
    console.error('News sitemap fell back to bundled entries:', error.message)
    cards = bundledCards
  }

  const articles = cards.filter((card) => card.kind === 'article')

  return res.status(200).send(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${articles.map(entry).join('\n')}\n</urlset>\n`
  )
}

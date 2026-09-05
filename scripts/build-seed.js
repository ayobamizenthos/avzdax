const fs = require('fs')
const path = require('path')

const seedDir = process.env.SEED_OUT
const cards = JSON.parse(fs.readFileSync(path.join(seedDir, 'cards.json'), 'utf8'))
const articles = JSON.parse(fs.readFileSync(path.join(seedDir, 'articles.json'), 'utf8'))

const mojibake = [
  [/â€™/g, String.fromCharCode(0x2019)],
  [/â€œ/g, String.fromCharCode(0x201c)],
  [/â€/g, String.fromCharCode(0x201d)],
  [/â€”/g, String.fromCharCode(0x2014)],
  [/â€“/g, String.fromCharCode(0x2013)],
  [/Â /g, " "]
]

const repair = (value) =>
  typeof value === 'string' ? mojibake.reduce((text, [from, to]) => text.replace(from, to), value) : value

const slugify = (title) =>
  title
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')

const innerOf = (html, className) => {
  const open = html.indexOf(`<div class="${className}">`)
  if (open === -1) return null
  let depth = 0
  let cursor = open
  while (cursor < html.length) {
    const nextOpen = html.indexOf('<div', cursor)
    const nextClose = html.indexOf('</div>', cursor)
    if (nextClose === -1) break
    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++
      cursor = nextOpen + 4
    } else {
      depth--
      if (depth === 0) {
        const bodyStart = html.indexOf('>', open) + 1
        return html.slice(bodyStart, nextClose)
      }
      cursor = nextClose + 6
    }
  }
  return null
}

const dedent = (html) => {
  const lines = html.replace(/\r/g, '').split('\n').filter((line) => line.trim())
  if (!lines.length) return ''
  const indent = Math.min(...lines.map((line) => line.match(/^ */)[0].length))
  return lines.map((line) => line.slice(indent)).join('\n').trim()
}

const kindOf = (card) => (card.videoUrl ? 'video' : card.externalUrl ? 'external' : 'article')

const posts = []
const seen = new Set()

cards.forEach((card, order) => {
  const slug = card.slug || slugify(card.title)
  seen.add(slug)
  const article = articles[slug]

  posts.push({
    slug,
    title: repair(card.title),
    excerpt: repair(card.excerpt),
    category: card.category,
    layout: card.layout,
    kind: kindOf(card),
    image: card.image,
    imageAlt: repair(card.imageAlt),
    imageTitle: repair(card.imageTitle),
    imageClass: card.imageClass,
    hasPlayButton: card.hasPlayButton,
    linkLabel: repair(card.linkLabel),
    videoUrl: card.videoUrl,
    externalUrl: card.externalUrl,
    linkUrl: card.linkHref && card.linkHref !== 'javascript:void(0)' ? card.linkHref : null,
    headline: article ? repair(innerOf(article.content, 'r-header') || '').replace(/<\/?h1[^>]*>/g, '').trim() : null,
    meta: article ? repair(article.meta) : null,
    content: article ? dedent(repair(innerOf(article.content, 'r-body') || '')) : '',
    status: 'published',
    position: order
  })
})

Object.keys(articles)
  .filter((slug) => !seen.has(slug))
  .forEach((slug, offset) => {
    const article = articles[slug]
    posts.push({
      slug,
      title: repair(article.title),
      excerpt: '',
      category: 'insight',
      layout: 'standard',
      kind: 'article',
      image: article.img || null,
      imageAlt: repair(article.title),
      imageTitle: repair(article.title),
      imageClass: null,
      hasPlayButton: false,
      linkLabel: 'Read Analysis',
      videoUrl: null,
      externalUrl: null,
      linkUrl: null,
      headline: repair(innerOf(article.content, 'r-header') || '').replace(/<\/?h1[^>]*>/g, '').trim(),
      meta: repair(article.meta),
      content: dedent(repair(innerOf(article.content, 'r-body') || '')),
      status: 'draft',
      position: cards.length + offset
    })
  })

fs.mkdirSync(path.join(seedDir, 'posts'), { recursive: true })
posts.forEach((post) => {
  fs.writeFileSync(path.join(seedDir, 'posts', post.slug + '.json'), JSON.stringify(post, null, 2))
})

const index = posts.map(({ headline, meta, content, ...card }) => card)
fs.writeFileSync(path.join(seedDir, 'index.json'), JSON.stringify(index, null, 2))

console.log('posts written:', posts.length)
console.log('published:', posts.filter((p) => p.status === 'published').length, '| drafts:', posts.filter((p) => p.status === 'draft').length)
console.log('articles with empty body:', posts.filter((p) => p.kind === 'article' && !p.content).map((p) => p.slug).join(', ') || 'none')
console.log('mojibake left:', posts.filter((p) => /â€|Â /.test(JSON.stringify(p))).length)

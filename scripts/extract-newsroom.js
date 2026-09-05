const fs = require('fs')
const path = require('path')
const vm = require('vm')

const source = fs.readFileSync(process.env.SOURCE_HTML || path.join(__dirname, '..', 'news.html'), 'utf8')

function readIntelDB(html) {
  const start = html.indexOf('const intelDB = {')
  const open = html.indexOf('{', start)
  let depth = 0
  let inTemplate = false
  for (let i = open; i < html.length; i++) {
    const ch = html[i]
    if (ch === '`') inTemplate = !inTemplate
    if (inTemplate) continue
    if (ch === '{') depth++
    if (ch === '}') {
      depth--
      if (depth === 0) {
        const literal = html.slice(open, i + 1)
        return vm.runInNewContext('(' + literal + ')')
      }
    }
  }
  throw new Error('intelDB literal not found')
}

function attr(fragment, name) {
  const match = fragment.match(new RegExp(name + '="([^"]*)"'))
  return match ? match[1] : null
}

function between(fragment, open, close) {
  const a = fragment.indexOf(open)
  if (a === -1) return null
  const b = fragment.indexOf(close, a + open.length)
  return b === -1 ? null : fragment.slice(a + open.length, b).trim()
}

const gridStart = source.indexOf('<div class="news-grid">')
const gridEnd = source.indexOf('</div> \n    </div>', gridStart)
const grid = source.slice(gridStart, gridEnd)

const cards = []
const cardPattern = /<div class="card-wrap ([a-z-]+) reveal-up"([\s\S]*?)\n            <\/div>/g
let match
while ((match = cardPattern.exec(grid))) {
  const [, layout, body] = match
  const image = body.match(/<img[^>]*>/)
  const imageTag = image ? image[0] : ''
  const linkTag = body.match(/<a ([^>]*)class="c-link"[^>]*>([\s\S]*?)<\/a>/)

  cards.push({
    layout: layout.replace('-card', ''),
    category: attr(body, 'data-category'),
    slug: attr(body, 'data-article-id'),
    videoUrl: attr(body, 'data-video-url'),
    externalUrl: attr(body, 'data-external-url'),
    title: between(body, '<h2 class="c-title">', '</h2>'),
    excerpt: between(body, '<p class="c-excerpt">', '</p>'),
    image: attr(imageTag, 'src'),
    imageAlt: attr(imageTag, 'alt'),
    imageTitle: attr(imageTag, 'title'),
    imageClass: (attr(imageTag, 'class') || '').replace('card-img', '').trim() || null,
    hasPlayButton: body.includes('play-trigger'),
    linkLabel: linkTag ? linkTag[2].trim() : null,
    linkHref: linkTag ? (linkTag[1].match(/href="([^"]*)"/) || [])[1] || null : null
  })
}

const intelDB = readIntelDB(source)

const out = process.env.SEED_OUT
fs.mkdirSync(out, { recursive: true })
fs.writeFileSync(path.join(out, 'cards.json'), JSON.stringify(cards, null, 2))
fs.writeFileSync(path.join(out, 'articles.json'), JSON.stringify(intelDB, null, 2))

console.log('cards:', cards.length)
console.log('articles in intelDB:', Object.keys(intelDB).length)
console.log('card kinds:', cards.map(c => c.videoUrl ? 'video' : c.externalUrl ? 'external' : 'article').join(', '))
console.log('missing titles:', cards.filter(c => !c.title).length)

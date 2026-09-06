const { put, head, del, list } = require('@vercel/blob')

const INDEX_PATH = 'newsroom/index.json'
const postPath = (slug) => `newsroom/posts/${slug}.json`
const MEDIA_PREFIX = 'newsroom/media/'

const CARD_FIELDS = [
  'slug', 'title', 'excerpt', 'category', 'layout', 'kind',
  'image', 'imageAlt', 'imageTitle', 'imageClass', 'hasPlayButton',
  'linkLabel', 'videoUrl', 'externalUrl', 'linkUrl', 'status', 'position', 'updatedAt'
]

// Blob pathnames are stable, so the resolved URL and the parsed body are both worth
// holding for the life of a warm function rather than paying two round trips per request.
const urlCache = new Map()
const bodyCache = new Map()
const BODY_TTL_MS = 5000

async function resolveUrl(pathname) {
  if (urlCache.has(pathname)) return urlCache.get(pathname)
  const meta = await head(pathname)
  urlCache.set(pathname, meta.url)
  return meta.url
}

async function readJson(pathname, { fresh = false } = {}) {
  const cached = fresh ? null : bodyCache.get(pathname)
  if (cached && cached.expires > Date.now()) return cached.value

  let url
  try {
    url = await resolveUrl(pathname)
  } catch {
    return null
  }

  // Blob objects sit behind a CDN. The store is written with a zero max-age, but a unique
  // query on every read guarantees a save is never masked by a cached copy.
  const response = await fetch(`${url}?t=${Date.now()}`, { cache: 'no-store' })

  if (!response.ok) {
    urlCache.delete(pathname)
    return null
  }

  const value = await response.json()
  bodyCache.set(pathname, { value, expires: Date.now() + BODY_TTL_MS })
  return value
}

async function writeJson(pathname, value) {
  const blob = await put(pathname, JSON.stringify(value), {
    access: 'public',
    contentType: 'application/json',
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: 0
  })

  urlCache.set(pathname, blob.url)
  bodyCache.set(pathname, { value, expires: Date.now() + BODY_TTL_MS })
}

function forget(pathname) {
  urlCache.delete(pathname)
  bodyCache.delete(pathname)
}

const toCard = (post) =>
  CARD_FIELDS.reduce((card, field) => {
    if (post[field] !== undefined) card[field] = post[field]
    return card
  }, {})

const byPosition = (a, b) => a.position - b.position

async function readIndex(options) {
  const index = await readJson(INDEX_PATH, options)
  return Array.isArray(index) ? index.sort(byPosition) : []
}

async function writeIndex(cards) {
  await writeJson(INDEX_PATH, cards.map((card, position) => ({ ...card, position })))
}

async function readPost(slug) {
  return readJson(postPath(slug))
}

const settled = (card, post) =>
  Boolean(card) && card.status === post.status && card.updatedAt === post.updatedAt

// Blob overwrites are not always visible to the next read. Without confirming the index
// afterwards a publish can leave the entry stale, so the post exists but never reaches
// the news page. Each attempt re-reads, re-merges and re-checks.
async function commitToIndex(post) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const index = await readIndex({ fresh: true })
    const at = index.findIndex((card) => card.slug === post.slug)

    if (at === -1) index.push(toCard(post))
    else index[at] = { ...index[at], ...toCard(post) }

    await writeIndex(index)

    const written = (await readIndex({ fresh: true })).find((card) => card.slug === post.slug)
    if (settled(written, post)) return

    await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)))
  }

  throw new Error('The entry saved but the list did not update. Try saving again.')
}

async function savePost(post) {
  const stamped = { ...post, updatedAt: new Date().toISOString() }
  await writeJson(postPath(stamped.slug), stamped)
  await commitToIndex(stamped)
  return stamped
}

async function deletePost(slug) {
  const index = await readIndex({ fresh: true })
  const remaining = index.filter((card) => card.slug !== slug)
  if (remaining.length === index.length) return false

  await writeIndex(remaining)

  if ((await readIndex({ fresh: true })).some((card) => card.slug === slug)) {
    await writeIndex(remaining)
  }

  try {
    const meta = await head(postPath(slug))
    forget(postPath(slug))
    await del(meta.url)
  } catch {
    // the index is the source of truth; a missing body file is not an error
  }
  return true
}

async function reorder(slugs) {
  const index = await readIndex()
  const bySlug = new Map(index.map((card) => [card.slug, card]))
  const ordered = slugs.map((slug) => bySlug.get(slug)).filter(Boolean)
  const untouched = index.filter((card) => !slugs.includes(card.slug))
  await writeIndex([...ordered, ...untouched])
  return ordered.length
}

async function listMedia() {
  const { blobs } = await list({ prefix: MEDIA_PREFIX })
  return blobs
    .map((blob) => ({
      url: blob.url,
      name: blob.pathname.slice(MEDIA_PREFIX.length),
      size: blob.size,
      uploadedAt: blob.uploadedAt
    }))
    .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt))
}

async function saveMedia(name, body, contentType) {
  const blob = await put(MEDIA_PREFIX + name, body, {
    access: 'public',
    contentType,
    addRandomSuffix: true
  })
  return blob.url
}

async function deleteMedia(url) {
  await del(url)
}

const ATTEMPTS_PATH = 'newsroom/sign-in-attempts.json'

const readAttempts = async () => (await readJson(ATTEMPTS_PATH, { fresh: true })) || {}
const writeAttempts = (record) => writeJson(ATTEMPTS_PATH, record)

const storageConfigured = () => Boolean(process.env.BLOB_READ_WRITE_TOKEN)

module.exports = {
  storageConfigured,
  readAttempts,
  writeAttempts,
  readIndex,
  writeIndex,
  readPost,
  savePost,
  deletePost,
  reorder,
  listMedia,
  saveMedia,
  deleteMedia,
  toCard
}

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

// An overwrite gives the object a new URL. A cached one therefore goes stale the moment
// anything is saved, and every warm instance holds its own copy - so a fresh read has to
// resolve the address again rather than trust what it remembers.
async function resolveUrl(pathname, fresh) {
  if (!fresh && urlCache.has(pathname)) return urlCache.get(pathname)
  const meta = await head(pathname)
  urlCache.set(pathname, meta.url)
  return meta.url
}

async function readJson(pathname, { fresh = false } = {}) {
  const cached = fresh ? null : bodyCache.get(pathname)
  if (cached && cached.expires > Date.now()) return cached.value

  let url
  try {
    url = await resolveUrl(pathname, fresh)
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

async function readPost(slug, options) {
  return readJson(postPath(slug), options)
}

const POSTS_PREFIX = 'newsroom/posts/'

// The index is rebuilt by read-modify-write, and storage can serve a copy a second or two
// behind. Writing that back would quietly drop whatever it did not know about, so the post
// files themselves are treated as the record and anything missing is put back.
async function reconcile(index) {
  const { blobs } = await list({ prefix: POSTS_PREFIX })
  const known = new Set(index.map((card) => card.slug))

  const missing = blobs
    .map((blob) => blob.pathname.slice(POSTS_PREFIX.length).replace(/\.json$/, ''))
    .filter((slug) => slug && !known.has(slug))

  for (const slug of missing) {
    const post = await readJson(postPath(slug), { fresh: true })
    if (post) index.push(toCard(post))
  }

  return index
}

async function savePost(post) {
  const stamped = { ...post, updatedAt: new Date().toISOString() }
  await writeJson(postPath(stamped.slug), stamped)

  const index = await readIndex({ fresh: true })
  const at = index.findIndex((card) => card.slug === stamped.slug)

  if (at === -1) index.push(toCard(stamped))
  else index[at] = { ...index[at], ...toCard(stamped) }

  await writeIndex(await reconcile(index))
  return stamped
}

async function deletePost(slug) {
  const index = await readIndex({ fresh: true })
  const remaining = index.filter((card) => card.slug !== slug)
  if (remaining.length === index.length) return false

  try {
    const meta = await head(postPath(slug))
    forget(postPath(slug))
    await del(meta.url)
  } catch {
    // the index is the source of truth; a missing body file is not an error
  }

  await writeIndex(await reconcile(remaining))
  return true
}

async function reorder(slugs) {
  const index = await readIndex({ fresh: true })
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

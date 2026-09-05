const sanitizeHtml = require('sanitize-html')

const CATEGORIES = ['insight', 'broadcast', 'blog']
const LAYOUTS = ['featured', 'standard', 'wide']
const KINDS = ['article', 'video', 'external']

const BODY_RULES = {
  allowedTags: [
    'p', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 's', 'blockquote',
    'ul', 'ol', 'li', 'a', 'img', 'br', 'hr', 'figure', 'figcaption', 'span', 'code', 'pre'
  ],
  allowedAttributes: {
    a: ['href', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'loading', 'decoding'],
    span: ['class'],
    p: ['class'],
    blockquote: ['class']
  },
  allowedSchemes: ['http', 'https', 'mailto'],
  allowedSchemesAppliedToAttributes: ['href', 'src'],
  transformTags: {
    a: (tagName, attribs) => ({
      tagName,
      attribs: attribs.href && /^https?:/i.test(attribs.href)
        ? { ...attribs, target: '_blank', rel: 'noopener noreferrer' }
        : attribs
    }),
    img: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, loading: 'lazy', decoding: 'async' }
    })
  }
}

const HEADLINE_RULES = {
  allowedTags: ['span', 'em', 'strong', 'br'],
  allowedAttributes: { span: ['class'] }
}

const cleanBody = (html) => sanitizeHtml(String(html || ''), BODY_RULES)
const cleanHeadline = (html) => sanitizeHtml(String(html || ''), HEADLINE_RULES)
const cleanText = (value) => sanitizeHtml(String(value || ''), { allowedTags: [], allowedAttributes: {} }).trim()

const DIACRITICS = /[\u0300-\u036f]/g

const slugify = (value) =>
  cleanText(value)
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[\u2018\u2019']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

const isSafeSlug = (value) => typeof value === 'string' && /^[a-z0-9][a-z0-9-]{1,79}$/.test(value)

const isSafeUrl = (value) =>
  typeof value === 'string' && (value.startsWith('/') || /^https?:\/\//i.test(value))

const youtubeId = (url) => {
  const match = String(url || '').match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/)([A-Za-z0-9_-]{11})/)
  return match ? match[1] : null
}

function validate(input) {
  const errors = []
  const title = cleanText(input.title)
  const kind = KINDS.includes(input.kind) ? input.kind : 'article'

  if (!title) errors.push('Give the post a title.')
  if (!CATEGORIES.includes(input.category)) errors.push('Choose a valid category.')
  if (!LAYOUTS.includes(input.layout)) errors.push('Choose a valid card size.')
  if (input.image && !isSafeUrl(input.image)) errors.push('The cover image address is not valid.')
  if (kind === 'video' && !youtubeId(input.videoUrl)) errors.push('Paste a valid YouTube link.')
  if (kind === 'external' && !/^https?:\/\//i.test(String(input.externalUrl || ''))) {
    errors.push('Paste a valid link for the external article.')
  }

  const slug = isSafeSlug(input.slug) ? input.slug : slugify(title)
  if (!isSafeSlug(slug)) errors.push('The title needs at least two letters or numbers.')

  return { errors, title, kind, slug }
}

const isDerivedThumbnail = (url) => String(url || '').startsWith('https://img.youtube.com/')

const coverFor = (image, videoId) => {
  const derived = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null
  if (derived && (!image || isDerivedThumbnail(image))) return derived
  return image || null
}

function normalise(input, existing) {
  const { errors, title, kind, slug } = validate(input)
  if (errors.length) return { errors }

  const videoId = kind === 'video' ? youtubeId(input.videoUrl) : null

  // A migrated entry may carry a hand-styled headline. Keep it while the title is unchanged,
  // and let it fall back to the plain title once the writer renames the post.
  const keepsHeadline = existing && existing.title === title
  const headline = cleanHeadline(input.headline) || (keepsHeadline ? existing.headline : null)

  return {
    post: {
      slug,
      title,
      excerpt: cleanText(input.excerpt),
      category: input.category,
      layout: input.layout,
      kind,
      image: coverFor(input.image, videoId),
      imageAlt: cleanText(input.imageAlt) || title,
      imageTitle: cleanText(input.imageTitle) || title,
      imageClass: existing ? existing.imageClass : null,
      hasPlayButton: kind === 'video',
      linkLabel: cleanText(input.linkLabel) || (kind === 'video' ? 'Watch Interview' : kind === 'external' ? 'Read Article' : 'Read Analysis'),
      videoUrl: kind === 'video' ? input.videoUrl : null,
      externalUrl: kind === 'external' ? input.externalUrl : null,
      linkUrl: existing ? existing.linkUrl || null : null,
      headline,
      meta: cleanText(input.meta) || null,
      content: kind === 'article' ? cleanBody(input.content) : '',
      status: input.status === 'draft' ? 'draft' : 'published',
      position: existing ? existing.position : 0,
      createdAt: existing ? existing.createdAt : new Date().toISOString()
    }
  }
}

module.exports = { CATEGORIES, LAYOUTS, KINDS, normalise, slugify, isSafeSlug, youtubeId, cleanBody }

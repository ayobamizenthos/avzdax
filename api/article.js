const { readPost, readIndex } = require('./_lib/store')
const { isSafeSlug } = require('./_lib/content')

const bundledBySlug = new Map(require('./_lib/seed/newsroom.json').map((post) => [post.slug, post]))

const SITE = 'https://www.avzdax.com'

const escapeHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const absolute = (url) => (url && url.startsWith('/') ? SITE + url : url)

const page = ({ head, body }) => `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <link rel="icon" type="image/png" href="/favicon.png">
    <link rel="apple-touch-icon" href="/favicon.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
${head}
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="/components/footer-styles.css" rel="stylesheet">
    <link href="/components/header-styles.css" rel="stylesheet">
    <link href="/components/article-styles.css" rel="stylesheet">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@200;400;600;900&family=JetBrains+Mono:wght@300;500&family=Syncopate:wght@700;800&display=swap">
    <style>
        body { margin: 0; background: #fff; -webkit-font-smoothing: antialiased; }
    </style>
</head>
<body>
<div id="header-container"></div>
<script src="/components/header-loader.js"></script>
${body}
<div style="background-color: #030303;" class="relative">
    <div id="footer-container"></div>
    <script src="/components/footer-loader.js"></script>
</div>
</body>
</html>`

function articlePage(post) {
  const title = escapeHtml(post.title)
  const description = escapeHtml(post.excerpt || post.title)
  const url = `${SITE}/news/${post.slug}`
  const image = absolute(post.image) || `${SITE}/media/avzdax-logo.png`

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt || undefined,
    image: image,
    datePublished: post.createdAt || post.updatedAt,
    dateModified: post.updatedAt || post.createdAt,
    mainEntityOfPage: url,
    author: { '@type': 'Organization', name: 'AVZDAX' },
    publisher: {
      '@type': 'Organization',
      name: 'AVZDAX',
      logo: { '@type': 'ImageObject', url: `${SITE}/media/avzdax-logo.png` }
    }
  }

  const head = `    <title>${title} | AVZDAX</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:type" content="article" />
    <meta property="og:title" content="${title} | AVZDAX" />
    <meta property="og:description" content="${description}" />
    <meta property="og:url" content="${url}" />
    <meta property="og:image" content="${escapeHtml(image)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${title} | AVZDAX" />
    <meta name="twitter:description" content="${description}" />
    <script type="application/ld+json">${JSON.stringify(schema)}</script>`

  const hero = post.image
    ? `            <div class="article-hero"><img src="${escapeHtml(post.image)}" alt="${escapeHtml(post.imageAlt || post.title)}"></div>`
    : ''

  const body = `<main data-nav-theme="light" class="article-page">
    <div class="article-shell">
        <a href="/news" class="article-back">&larr; Newsroom</a>
${post.meta ? `        <p class="article-meta">${escapeHtml(post.meta)}</p>` : ''}
        <h1 class="article-title">${post.headline || title}</h1>
${hero}
        <div class="article-body">${post.content}</div>
    </div>
</main>`

  return page({ head, body })
}

const notFoundPage = () =>
  page({
    head: `    <title>Not found | AVZDAX</title>
    <meta name="robots" content="noindex" />`,
    body: `<main data-nav-theme="light" class="article-page">
    <div class="article-shell">
        <a href="/news" class="article-back">&larr; Newsroom</a>
        <h1 class="article-title">That entry is not here.</h1>
        <div class="article-body"><p>It may have been unpublished or the address mistyped.</p></div>
    </div>
</main>`
  })

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).send('Method Not Allowed')
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8')

  const slug = req.query.slug

  if (!isSafeSlug(slug)) {
    res.setHeader('Cache-Control', 'no-store')
    return res.status(404).send(notFoundPage())
  }

  try {
    let post = await readPost(slug)
    if (!post && !(await readIndex()).length) post = bundledBySlug.get(slug)

    if (!post || post.status !== 'published' || post.kind !== 'article') {
      res.setHeader('Cache-Control', 'no-store')
      return res.status(404).send(notFoundPage())
    }

    res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=3600')
    return res.status(200).send(articlePage(post))
  } catch (error) {
    console.error('Article render failed:', error.message)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(500).send(notFoundPage())
  }
}

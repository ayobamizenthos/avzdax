const $ = (id) => document.getElementById(id)

const state = {
  posts: [],
  editing: null,
  coverUrl: null
}

const escapeHtml = (value) =>
  String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

async function api(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    headers: options.body ? { 'Content-Type': 'application/json' } : undefined,
    ...options
  })

  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (response.status === 401) {
    showGate()
    throw new Error('Your session ended. Sign in again.')
  }

  if (!response.ok) throw new Error((payload && payload.error) || 'Something went wrong.')
  return payload
}

let flashTimer
function flash(message, good = false) {
  const box = $('flash')
  box.textContent = message
  box.classList.toggle('good', good)
  box.classList.remove('hidden')
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => box.classList.add('hidden'), 4000)
}

function showGate() {
  $('gate').classList.remove('hidden')
  $('app').classList.add('hidden')
}

function showApp() {
  $('gate').classList.add('hidden')
  $('app').classList.remove('hidden')
}

function showView(name) {
  ;['posts', 'editor', 'media'].forEach((view) => {
    $('view-' + view).classList.toggle('hidden', view !== name)
  })
  document.querySelectorAll('.rail nav button').forEach((button) => {
    button.classList.toggle('on', button.dataset.view === name)
  })
}

$('gate-form').addEventListener('submit', async (event) => {
  event.preventDefault()
  const error = $('gate-error')
  error.classList.add('hidden')

  try {
    await api('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ password: $('gate-password').value })
    })
    $('gate-password').value = ''
    showApp()
    await loadPosts()
  } catch (problem) {
    error.textContent = problem.message
    error.classList.remove('hidden')
  }
})

$('sign-out').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
  showGate()
})

document.querySelectorAll('.rail nav button').forEach((button) => {
  button.addEventListener('click', () => {
    const view = button.dataset.view
    showView(view)
    if (view === 'posts') loadPosts()
    if (view === 'media') loadMedia()
  })
})

const KIND_LABEL = { article: 'Article', video: 'Video', external: 'Link' }

function rowMarkup(post) {
  const cover = post.image
    ? `<img class="thumb" src="${escapeHtml(post.image)}" alt="">`
    : '<div class="thumb"></div>'

  return `
    <div class="row" draggable="true" data-slug="${escapeHtml(post.slug)}">
      <div class="grip" title="Drag to reorder">::</div>
      ${cover}
      <div>
        <p class="row-title">${escapeHtml(post.title)}</p>
        <div class="row-sub">
          <span class="chip ${post.status === 'published' ? 'live' : ''}">${post.status === 'published' ? 'Live' : 'Draft'}</span>
          <span class="chip">${escapeHtml(post.category)}</span>
          <span class="chip">${KIND_LABEL[post.kind] || 'Article'}</span>
          <span class="chip">${escapeHtml(post.layout)}</span>
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" data-edit="${escapeHtml(post.slug)}">Edit</button>
        <button class="icon-btn warn" data-remove="${escapeHtml(post.slug)}">Delete</button>
      </div>
    </div>`
}

async function loadPosts() {
  const rows = $('post-rows')
  rows.innerHTML = '<div class="empty">Loading.</div>'

  try {
    const { posts } = await api('/api/admin/posts')
    state.posts = posts

    rows.innerHTML = posts.length
      ? posts.map(rowMarkup).join('')
      : '<div class="empty">Nothing here yet.<br><br><button class="btn" id="import-old">Bring in the 18 existing entries</button></div>'

    if (!posts.length) wireImport()
    wireRows()
  } catch (problem) {
    rows.innerHTML = `<div class="empty">${escapeHtml(problem.message)}</div>`
  }
}

let draggedSlug = null

function wireRows() {
  const rows = Array.from($('post-rows').querySelectorAll('.row'))

  rows.forEach((row) => {
    row.addEventListener('dragstart', () => {
      draggedSlug = row.dataset.slug
      row.classList.add('dragging')
    })

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging')
      rows.forEach((other) => other.classList.remove('over'))
    })

    row.addEventListener('dragover', (event) => {
      event.preventDefault()
      if (row.dataset.slug !== draggedSlug) row.classList.add('over')
    })

    row.addEventListener('dragleave', () => row.classList.remove('over'))

    row.addEventListener('drop', async (event) => {
      event.preventDefault()
      row.classList.remove('over')
      if (!draggedSlug || row.dataset.slug === draggedSlug) return

      const order = Array.from($('post-rows').querySelectorAll('.row')).map((r) => r.dataset.slug)
      const from = order.indexOf(draggedSlug)
      order.splice(from, 1)
      order.splice(order.indexOf(row.dataset.slug), 0, draggedSlug)

      try {
        await api('/api/admin/reorder', { method: 'POST', body: JSON.stringify({ slugs: order }) })
        flash('Order saved.', true)
        loadPosts()
      } catch (problem) {
        flash(problem.message)
      }
    })
  })

  $('post-rows').querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => openEditor(button.dataset.edit))
  })

  $('post-rows').querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => removePost(button.dataset.remove))
  })
}

async function removePost(slug) {
  const post = state.posts.find((item) => item.slug === slug)
  if (!window.confirm(`Delete "${post ? post.title : slug}"? This cannot be undone.`)) return

  try {
    await api('/api/admin/posts?slug=' + encodeURIComponent(slug), { method: 'DELETE' })
    flash('Deleted.', true)
    loadPosts()
  } catch (problem) {
    flash(problem.message)
  }
}

const blank = {
  slug: null,
  title: '',
  excerpt: '',
  category: 'insight',
  layout: 'standard',
  kind: 'article',
  image: null,
  imageAlt: '',
  linkLabel: '',
  videoUrl: '',
  externalUrl: '',
  headline: null,
  meta: '',
  content: '',
  status: 'published'
}

function applyKind() {
  const kind = $('f-kind').value
  $('wrap-video').classList.toggle('hidden', kind !== 'video')
  $('wrap-external').classList.toggle('hidden', kind !== 'external')
  $('body-card').classList.toggle('hidden', kind !== 'article')
}

function fillEditor(post) {
  state.editing = post.slug
  state.coverUrl = post.image || null

  $('f-title').value = post.title || ''
  $('f-excerpt').value = post.excerpt || ''
  $('f-category').value = post.category || 'insight'
  $('f-layout').value = post.layout || 'standard'
  $('f-kind').value = post.kind || 'article'
  $('f-status').value = post.status || 'published'
  $('f-video').value = post.videoUrl || ''
  $('f-external').value = post.externalUrl || ''
  $('f-linklabel').value = post.linkLabel || ''
  $('f-meta').value = post.meta || ''
  $('f-content').innerHTML = post.content || ''

  setCover(post.image || null)
  applyKind()

  $('editor-mode').textContent = post.slug ? 'Editing' : 'New entry'
  $('editor-heading').textContent = post.slug ? post.title : 'Write a post'
  $('editor-delete').classList.toggle('hidden', !post.slug)
}

async function openEditor(slug) {
  showView('editor')

  if (!slug) {
    fillEditor({ ...blank })
    $('f-title').focus()
    return
  }

  try {
    const post = await api('/api/admin/posts?slug=' + encodeURIComponent(slug))
    fillEditor(post)
  } catch (problem) {
    flash(problem.message)
    showView('posts')
  }
}

function collect() {
  const kind = $('f-kind').value
  return {
    slug: state.editing || undefined,
    title: $('f-title').value.trim(),
    excerpt: $('f-excerpt').value.trim(),
    category: $('f-category').value,
    layout: $('f-layout').value,
    kind,
    status: $('f-status').value,
    image: state.coverUrl,
    imageAlt: $('f-title').value.trim(),
    imageTitle: $('f-title').value.trim(),
    linkLabel: $('f-linklabel').value.trim(),
    videoUrl: $('f-video').value.trim(),
    externalUrl: $('f-external').value.trim(),
    meta: $('f-meta').value.trim(),
    headline: null,
    content: kind === 'article' ? $('f-content').innerHTML : ''
  }
}

$('new-post').addEventListener('click', () => openEditor(null))
$('editor-back').addEventListener('click', () => { showView('posts'); loadPosts() })
$('f-kind').addEventListener('change', applyKind)

$('editor-save').addEventListener('click', async () => {
  const button = $('editor-save')
  button.disabled = true

  try {
    const { post } = await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(collect()) })
    state.editing = post.slug
    state.coverUrl = post.image || null
    $('editor-mode').textContent = 'Editing'
    $('editor-heading').textContent = post.title
    $('editor-delete').classList.remove('hidden')
    flash(post.status === 'published' ? 'Saved. It appears on the news page within a minute.' : 'Saved as a draft, hidden from the site.', true)
  } catch (problem) {
    flash(problem.message)
  } finally {
    button.disabled = false
  }
})

$('editor-delete').addEventListener('click', async () => {
  if (!state.editing) return
  await removePost(state.editing)
  showView('posts')
})

const MAX_EDGE = 1920

function resizeToWebp(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('That file could not be read.'))
    reader.onload = () => {
      const image = new Image()
      image.onerror = () => reject(new Error('That file is not an image.'))
      image.onload = () => {
        const scale = Math.min(1, MAX_EDGE / Math.max(image.width, image.height))
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(image.width * scale)
        canvas.height = Math.round(image.height * scale)
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height)
        resolve(canvas.toDataURL('image/webp', 0.85))
      }
      image.src = reader.result
    }
    reader.readAsDataURL(file)
  })
}

async function uploadImage(file) {
  const dataUrl = await resizeToWebp(file)
  const { url } = await api('/api/admin/media', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, dataUrl })
  })
  return url
}

function pickFile() {
  return new Promise((resolve) => {
    const input = $('file-input')
    input.value = ''
    input.onchange = () => resolve(input.files[0] || null)
    input.click()
  })
}

function setCover(url) {
  const preview = $('cover-preview')
  preview.src = url || ''
  preview.classList.toggle('hidden', !url)
  $('cover-hint').classList.toggle('hidden', Boolean(url))
  $('cover-clear').classList.toggle('hidden', !url)
}

$('cover-pick').addEventListener('click', async () => {
  const file = await pickFile()
  if (!file) return
  try {
    const url = await uploadImage(file)
    state.coverUrl = url
    setCover(url)
    flash('Image added.', true)
  } catch (problem) {
    flash(problem.message)
  }
})

$('cover-clear').addEventListener('click', () => {
  state.coverUrl = null
  setCover(null)
})

const dropZone = $('cover-drop')
;['dragenter', 'dragover'].forEach((type) =>
  dropZone.addEventListener(type, (event) => {
    event.preventDefault()
    dropZone.classList.add('drop')
  })
)
;['dragleave', 'drop'].forEach((type) =>
  dropZone.addEventListener(type, () => dropZone.classList.remove('drop'))
)

dropZone.addEventListener('drop', async (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (!file) return
  try {
    const url = await uploadImage(file)
    state.coverUrl = url
    setCover(url)
    flash('Image added.', true)
  } catch (problem) {
    flash(problem.message)
  }
})

document.querySelectorAll('.toolbar [data-cmd]').forEach((button) => {
  button.addEventListener('click', () => {
    document.execCommand(button.dataset.cmd, false, null)
    $('f-content').focus()
  })
})

document.querySelectorAll('.toolbar [data-block]').forEach((button) => {
  button.addEventListener('click', () => {
    document.execCommand('formatBlock', false, button.dataset.block)
    $('f-content').focus()
  })
})

$('tb-link').addEventListener('click', () => {
  const href = window.prompt('Link address')
  if (!href) return
  document.execCommand('createLink', false, href)
  $('f-content').focus()
})

$('tb-image').addEventListener('click', async () => {
  const file = await pickFile()
  if (!file) return
  try {
    const url = await uploadImage(file)
    $('f-content').focus()
    document.execCommand('insertHTML', false, `<img src="${escapeHtml(url)}" alt="">`)
  } catch (problem) {
    flash(problem.message)
  }
})

$('f-content').addEventListener('paste', (event) => {
  event.preventDefault()
  const text = (event.clipboardData || window.clipboardData).getData('text/plain')
  document.execCommand('insertText', false, text)
})

async function loadMedia() {
  const grid = $('media-grid')
  grid.innerHTML = '<div class="empty">Loading.</div>'

  try {
    const { media } = await api('/api/admin/media')

    grid.innerHTML = media.length
      ? media
          .map(
            (item) => `
      <div class="media-item">
        <img src="${escapeHtml(item.url)}" alt="">
        <footer>
          <span class="name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <button class="icon-btn warn" data-drop="${escapeHtml(item.url)}">Delete</button>
        </footer>
      </div>`
          )
          .join('')
      : '<div class="empty">No images uploaded yet.</div>'

    grid.querySelectorAll('[data-drop]').forEach((button) => {
      button.addEventListener('click', async () => {
        if (!window.confirm('Delete this image? Any post using it will lose it.')) return
        try {
          await api('/api/admin/media?url=' + encodeURIComponent(button.dataset.drop), { method: 'DELETE' })
          flash('Image deleted.', true)
          loadMedia()
        } catch (problem) {
          flash(problem.message)
        }
      })
    })
  } catch (problem) {
    grid.innerHTML = `<div class="empty">${escapeHtml(problem.message)}</div>`
  }
}

$('media-add').addEventListener('click', async () => {
  const file = await pickFile()
  if (!file) return
  try {
    await uploadImage(file)
    flash('Image uploaded.', true)
    loadMedia()
  } catch (problem) {
    flash(problem.message)
  }
})

async function boot() {
  try {
    const session = await (await fetch('/api/admin/session', { credentials: 'same-origin' })).json()

    if (!session.configured) {
      $('gate').classList.remove('hidden')
      const error = $('gate-error')
      error.textContent = 'Sign-in is not set up yet. Add ADMIN_PASSWORD in Vercel, then redeploy.'
      error.classList.remove('hidden')
      return
    }

    if (session.signedIn) {
      showApp()
      showView('posts')
      if (!session.storageReady) {
        flash('Storage is not connected yet. Create a Blob store in Vercel and redeploy, then reload this page.')
      }
      await loadPosts()
    } else {
      showGate()
    }
  } catch {
    showGate()
  }
}

boot()

function wireImport() {
  const button = $('import-old')
  if (!button) return

  button.addEventListener('click', async () => {
    button.disabled = true
    button.textContent = 'Bringing them in...'

    try {
      const { imported } = await api('/api/admin/import', { method: 'POST' })
      flash(`${imported} entries imported.`, true)
      loadPosts()
    } catch (problem) {
      flash(problem.message)
      button.disabled = false
      button.textContent = 'Bring in the 18 existing entries'
    }
  })
}

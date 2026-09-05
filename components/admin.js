const $ = (id) => document.getElementById(id)

const state = {
  posts: [],
  tab: 'published',
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
  flashTimer = setTimeout(() => box.classList.add('hidden'), 4500)
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
  $('view-posts').classList.toggle('hidden', name !== 'posts')
  $('view-editor').classList.toggle('hidden', name !== 'editor')
  window.scrollTo({ top: 0, behavior: 'instant' })
}

$('toggle-password').addEventListener('click', () => {
  const input = $('gate-password')
  const revealed = input.type === 'text'

  input.type = revealed ? 'password' : 'text'
  $('toggle-password').setAttribute('aria-pressed', String(!revealed))
  $('toggle-password').setAttribute('aria-label', revealed ? 'Show password' : 'Hide password')
  input.focus()
})

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

const ask = (() => {
  const dialog = $('ask')
  let settle = null

  const close = (value) => {
    // settle is cleared first: dialog.close() fires its own close event synchronously,
    // which would otherwise re-enter here and resolve with null.
    const done = settle
    settle = null
    if (dialog.open) dialog.close()
    if (done) done(value)
  }

  $('ask-cancel').addEventListener('click', () => close(null))
  $('ask-confirm').addEventListener('click', () => {
    const field = $('ask-field')
    close(field.classList.contains('hidden') ? true : $('ask-input').value.trim() || null)
  })
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(null) })
  dialog.addEventListener('close', () => close(null))
  $('ask-input').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') { event.preventDefault(); $('ask-confirm').click() }
  })

  return ({ title, body = '', confirmLabel = 'Confirm', danger = false, input = null }) =>
    new Promise((resolve) => {
      settle = resolve

      $('ask-title').textContent = title
      $('ask-body').textContent = body
      $('ask-body').classList.toggle('hidden', !body)

      const field = $('ask-field')
      field.classList.toggle('hidden', !input)
      if (input) {
        $('ask-label').textContent = input.label
        $('ask-input').value = input.value || ''
        $('ask-input').placeholder = input.placeholder || ''
      }

      const confirm = $('ask-confirm')
      confirm.textContent = confirmLabel
      confirm.classList.toggle('danger', danger)

      dialog.showModal()
      ;(input ? $('ask-input') : $('ask-cancel')).focus()
    })
})()

const KIND_LABEL = { article: 'Article', video: 'Video', external: 'Link' }

document.querySelectorAll('.tab').forEach((tab) => {
  tab.addEventListener('click', () => selectTab(tab.dataset.tab))
})

function selectTab(name) {
  state.tab = name

  document.querySelectorAll('.tab').forEach((tab) => {
    const on = tab.dataset.tab === name
    tab.classList.toggle('on', on)
    tab.setAttribute('aria-selected', String(on))
  })

  const showingMedia = name === 'images'
  $('media-panel').classList.toggle('hidden', !showingMedia)
  $('post-rows').classList.toggle('hidden', showingMedia)
  $('new-post').classList.toggle('hidden', showingMedia)

  $('tab-hint').textContent = showingMedia
    ? 'Images you have uploaded, ready to reuse in any post.'
    : name === 'draft'
      ? 'Drafts stay off the news page. Order them here and they publish into that position.'
      : 'Drag a row, or use the arrows, to change where it sits on the news page.'

  if (showingMedia) loadMedia()
  else renderRows()
}

function countsFrom(posts) {
  $('count-published').textContent = posts.filter((p) => p.status === 'published').length
  $('count-draft').textContent = posts.filter((p) => p.status === 'draft').length
}

function rowMarkup(post, index, total) {
  const cover = post.image
    ? `<img class="thumb" src="${escapeHtml(post.image)}" alt="" loading="lazy">`
    : '<span class="thumb"></span>'

  const live = post.status === 'published'
    ? '<span class="mark" aria-hidden="true"></span>Live'
    : 'Draft'

  const arrows = `<button class="act" data-move="up" data-slug="${escapeHtml(post.slug)}" aria-label="Move up"${index === 0 ? ' disabled' : ''}>&uarr;</button>
          <button class="act" data-move="down" data-slug="${escapeHtml(post.slug)}" aria-label="Move down"${index === total - 1 ? ' disabled' : ''}>&darr;</button>`

  return `
      <article class="row" draggable="true" data-slug="${escapeHtml(post.slug)}">
        <span class="grip" aria-hidden="true">|||</span>
        ${cover}
        <div>
          <h3 class="row-title">${escapeHtml(post.title)}</h3>
          <p class="row-meta">${live}<span class="sep">/</span>${escapeHtml(post.category)}<span class="sep">/</span>${KIND_LABEL[post.kind] || 'Article'}<span class="sep">/</span>${escapeHtml(post.layout)}</p>
        </div>
        <div class="row-actions">
          ${arrows}
          <button class="act" data-edit="${escapeHtml(post.slug)}">Edit</button>
          <button class="act warn" data-remove="${escapeHtml(post.slug)}">Delete</button>
        </div>
      </article>`
}

function renderRows() {
  const rows = $('post-rows')
  const visible = state.posts.filter((post) => post.status === state.tab)

  if (!visible.length) {
    rows.innerHTML = state.posts.length
      ? `<p class="empty">${state.tab === 'draft' ? 'No drafts. Anything you save as a draft appears here.' : 'Nothing published yet.'}</p>`
      : '<div class="empty">This newsroom is empty.<br><button class="btn" id="import-old">Bring in the 18 existing entries</button></div>'

    if (!state.posts.length) wireImport()
    return
  }

  rows.innerHTML = visible.map((post, i) => rowMarkup(post, i, visible.length)).join('')
  wireRows()
}

async function loadPosts() {
  $('post-rows').innerHTML = '<p class="empty">Loading.</p>'

  try {
    const { posts } = await api('/api/admin/posts')
    state.posts = posts
    countsFrom(posts)
    renderRows()
  } catch (problem) {
    $('post-rows').innerHTML = `<p class="empty">${escapeHtml(problem.message)}</p>`
  }
}

async function saveOrder(slugs) {
  try {
    await api('/api/admin/reorder', { method: 'POST', body: JSON.stringify({ slugs }) })
    await loadPosts()
    flash('Order saved.', true)
  } catch (problem) {
    flash(problem.message)
  }
}

// Rows are reordered inside the open tab. The other tab keeps its own order untouched,
// so publishing a draft later drops it exactly where it was placed.
function partition() {
  const inTab = state.posts.filter((p) => p.status === state.tab).map((p) => p.slug)
  const others = state.posts.filter((p) => p.status !== state.tab).map((p) => p.slug)
  return { inTab, others }
}

function moveBy(slug, offset) {
  const { inTab, others } = partition()
  const from = inTab.indexOf(slug)
  const to = from + offset

  if (from === -1 || to < 0 || to >= inTab.length) return

  inTab.splice(to, 0, inTab.splice(from, 1)[0])
  saveOrder([...inTab, ...others])
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

    row.addEventListener('drop', (event) => {
      event.preventDefault()
      row.classList.remove('over')
      if (!draggedSlug || row.dataset.slug === draggedSlug) return

      const { inTab, others } = partition()
      inTab.splice(inTab.indexOf(draggedSlug), 1)
      inTab.splice(inTab.indexOf(row.dataset.slug), 0, draggedSlug)
      saveOrder([...inTab, ...others])
    })
  })

  const rowsRoot = $('post-rows')
  rowsRoot.querySelectorAll('[data-move]').forEach((button) => {
    button.addEventListener('click', () => moveBy(button.dataset.slug, button.dataset.move === 'up' ? -1 : 1))
  })
  rowsRoot.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => openEditor(button.dataset.edit))
  })
  rowsRoot.querySelectorAll('[data-remove]').forEach((button) => {
    button.addEventListener('click', () => removePost(button.dataset.remove))
  })
}

function wireImport() {
  const button = $('import-old')
  if (!button) return

  button.addEventListener('click', async () => {
    button.disabled = true
    button.textContent = 'Bringing them in...'

    try {
      const { imported } = await api('/api/admin/import', { method: 'POST' })
      flash(`${imported} entries imported.`, true)
      await loadPosts()
    } catch (problem) {
      flash(problem.message)
      button.disabled = false
      button.textContent = 'Bring in the 18 existing entries'
    }
  })
}

async function removePost(slug) {
  const post = state.posts.find((item) => item.slug === slug)

  const sure = await ask({
    title: 'Delete this post?',
    body: post ? post.title : slug,
    confirmLabel: 'Delete',
    danger: true
  })

  if (!sure) return

  try {
    await api('/api/admin/posts?slug=' + encodeURIComponent(slug), { method: 'DELETE' })
    flash('Deleted.', true)
    await loadPosts()
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
  linkLabel: '',
  videoUrl: '',
  externalUrl: '',
  content: '',
  status: 'published'
}

function applyKind() {
  const kind = $('f-kind').value
  $('wrap-video').classList.toggle('hidden', kind !== 'video')
  $('wrap-external').classList.toggle('hidden', kind !== 'external')
  $('body-card').classList.toggle('hidden', kind !== 'article')
}

function setCover(url) {
  const preview = $('cover-preview')
  preview.src = url || ''
  preview.classList.toggle('hidden', !url)
  $('cover-hint').classList.toggle('hidden', Boolean(url))
  $('cover-clear').classList.toggle('hidden', !url)
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
  $('f-content').innerHTML = post.content || ''

  setCover(post.image || null)
  applyKind()

  $('save-state').textContent = post.slug ? 'Editing' : 'New entry'
  $('editor-delete').classList.toggle('hidden', !post.slug)
}

async function openEditor(slug) {
  showView('editor')

  if (!slug) {
    fillEditor({ ...blank, status: state.tab === 'draft' ? 'draft' : 'published' })
    $('f-title').focus()
    return
  }

  try {
    fillEditor(await api('/api/admin/posts?slug=' + encodeURIComponent(slug)))
  } catch (problem) {
    flash(problem.message)
    showView('posts')
  }
}

function collect() {
  const kind = $('f-kind').value
  const title = $('f-title').value.trim()

  return {
    slug: state.editing || undefined,
    title,
    excerpt: $('f-excerpt').value.trim(),
    category: $('f-category').value,
    layout: $('f-layout').value,
    kind,
    status: $('f-status').value,
    image: state.coverUrl,
    imageAlt: title,
    imageTitle: title,
    linkLabel: $('f-linklabel').value.trim(),
    videoUrl: $('f-video').value.trim(),
    externalUrl: $('f-external').value.trim(),
    headline: null,
    content: kind === 'article' ? $('f-content').innerHTML : ''
  }
}

$('new-post').addEventListener('click', () => openEditor(null))
$('f-kind').addEventListener('change', applyKind)

$('editor-back').addEventListener('click', async () => {
  showView('posts')
  await loadPosts()
})

$('editor-save').addEventListener('click', async () => {
  const button = $('editor-save')
  button.disabled = true
  $('save-state').textContent = 'Saving'

  try {
    const { post } = await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(collect()) })
    state.editing = post.slug
    state.coverUrl = post.image || null
    $('save-state').textContent = 'Saved'
    $('editor-delete').classList.remove('hidden')
    flash(post.status === 'published' ? 'Saved. It appears on the news page within a minute.' : 'Saved as a draft, hidden from the site.', true)
  } catch (problem) {
    $('save-state').textContent = 'Not saved'
    flash(problem.message)
  } finally {
    button.disabled = false
  }
})

$('editor-delete').addEventListener('click', async () => {
  if (!state.editing) return
  const slug = state.editing
  await removePost(slug)
  if (!state.posts.some((p) => p.slug === slug)) showView('posts')
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
  const { url } = await api('/api/admin/media', {
    method: 'POST',
    body: JSON.stringify({ name: file.name, dataUrl: await resizeToWebp(file) })
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

async function useAsCover(file) {
  try {
    const url = await uploadImage(file)
    state.coverUrl = url
    setCover(url)
    flash('Image added.', true)
  } catch (problem) {
    flash(problem.message)
  }
}

$('cover-pick').addEventListener('click', async () => {
  const file = await pickFile()
  if (file) useAsCover(file)
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
;['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, () => dropZone.classList.remove('drop')))

dropZone.addEventListener('drop', (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (file) useAsCover(file)
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

$('tb-link').addEventListener('click', async () => {
  const selection = window.getSelection()
  const range = selection.rangeCount ? selection.getRangeAt(0) : null

  const href = await ask({
    title: 'Add a link',
    confirmLabel: 'Add link',
    input: { label: 'Address', placeholder: 'https://' }
  })

  if (!href) return

  $('f-content').focus()
  if (range) {
    selection.removeAllRanges()
    selection.addRange(range)
  }
  document.execCommand('createLink', false, href)
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
  grid.innerHTML = '<p class="empty">Loading.</p>'

  try {
    const { media } = await api('/api/admin/media')

    grid.innerHTML = media.length
      ? media.map((item) => `
      <figure class="media-item">
        <img src="${escapeHtml(item.url)}" alt="" loading="lazy">
        <figcaption class="media-foot">
          <span class="media-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <button class="act warn" data-drop="${escapeHtml(item.url)}">Delete</button>
        </figcaption>
      </figure>`).join('')
      : '<p class="empty">No images uploaded yet.</p>'

    grid.querySelectorAll('[data-drop]').forEach((button) => {
      button.addEventListener('click', async () => {
        const sure = await ask({
          title: 'Delete this image?',
          body: 'Any post still using it will lose it.',
          confirmLabel: 'Delete',
          danger: true
        })
        if (!sure) return
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
    grid.innerHTML = `<p class="empty">${escapeHtml(problem.message)}</p>`
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
      showGate()
      const error = $('gate-error')
      error.textContent = 'Sign-in is not set up yet. Add ADMIN_PASSWORD in Vercel, then redeploy.'
      error.classList.remove('hidden')
      return
    }

    if (!session.signedIn) return showGate()

    showApp()
    showView('posts')
    if (!session.storageReady) flash('Storage is not connected yet. Create a Blob store in Vercel and redeploy.')
    await loadPosts()
  } catch {
    showGate()
  }
}

boot()

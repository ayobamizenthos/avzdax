const $ = (id) => document.getElementById(id)

const state = { posts: [], tab: 'all', editing: null, coverUrl: null }

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
function flash(message) {
  const box = $('flash')
  box.textContent = message
  box.classList.remove('hidden')
  clearTimeout(flashTimer)
  flashTimer = setTimeout(() => box.classList.add('hidden'), 4200)
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
  document.body.classList.toggle('editing', name === 'editor')
  hideToolbar()
  if (name !== 'editor') { closeSettings(); hideToolbar() }
  window.scrollTo(0, 0)
}

const ask = (() => {
  const dialog = $('ask')
  let settle = null

  const close = (value) => {
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

  return ({ title, body = '', confirmLabel = 'Confirm', input = null }) =>
    new Promise((resolve) => {
      settle = resolve
      $('ask-title').textContent = title
      $('ask-body').textContent = body
      $('ask-body').classList.toggle('hidden', !body)

      const field = $('ask-field')
      field.classList.toggle('hidden', !input)
      if (input) {
        $('ask-label').textContent = input.label
        $('ask-input').value = ''
        $('ask-input').placeholder = input.placeholder || ''
      }

      $('ask-confirm').textContent = confirmLabel
      dialog.showModal()
      ;(input ? $('ask-input') : $('ask-cancel')).focus()
    })
})()

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
    await api('/api/admin/login', { method: 'POST', body: JSON.stringify({ password: $('gate-password').value }) })
    $('gate-password').value = ''
    showApp()
    await loadPosts()
  } catch (problem) {
    error.textContent = problem.message
    error.classList.remove('hidden')
  }
})

$('sign-out').addEventListener('click', async () => {
  const sure = await ask({ title: 'Sign out', body: 'Are you sure you want to sign out?', confirmLabel: 'Sign out' })
  if (!sure) return
  await fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
  showGate()
})

const KIND_LABEL = { article: 'Article', video: 'Video', external: 'Link' }

document.querySelectorAll('#post-filters .filter').forEach((button) => {
  button.addEventListener('click', () => selectTab(button.dataset.tab))
})

function selectTab(name) {
  state.tab = name

  document.querySelectorAll('#post-filters .filter').forEach((filter) => {
    const active = filter.dataset.tab === name
    filter.classList.toggle('on', active)
    filter.setAttribute('aria-selected', String(active))
  })

  const images = name === 'images'
  $('media-panel').classList.toggle('hidden', !images)
  $('post-rows').classList.toggle('hidden', images)

  if (images) loadMedia()
  else renderRows()
}

function updateCounts(posts) {
  $('count-all').textContent = posts.length
  $('count-published').textContent = posts.filter((post) => post.status === 'published').length
  $('count-draft').textContent = posts.filter((post) => post.status === 'draft').length
}

function visiblePosts() {
  return state.tab === 'all' || state.tab === 'images'
    ? state.posts
    : state.posts.filter((post) => post.status === state.tab)
}

function postMarkup(post, index, total) {
  const cover = post.image
    ? `<img class="post-cover" src="${escapeHtml(post.image)}" alt="" loading="lazy">`
    : '<span class="post-cover"></span>'

  const status = post.status === 'published'
    ? '<span class="live">Published</span>'
    : '<span>Draft</span>'

  return `
    <article class="post-row" draggable="true" data-slug="${escapeHtml(post.slug)}">
      <div>
        <h2 class="post-title">${escapeHtml(post.title)}</h2>
        ${post.excerpt ? `<p class="post-excerpt">${escapeHtml(post.excerpt)}</p>` : ''}
        <p class="post-meta">
          ${status}<span class="sep">&middot;</span>${escapeHtml(post.category)}<span class="sep">&middot;</span>${KIND_LABEL[post.kind] || 'Article'}<span class="sep">&middot;</span>${escapeHtml(post.layout)}
        </p>
      </div>
      ${cover}
      <div class="post-actions">
        <button data-edit="${escapeHtml(post.slug)}">Edit</button>
        <button class="danger" data-remove="${escapeHtml(post.slug)}">Delete</button>
        <span class="arrows">
          <button data-move="up" data-slug="${escapeHtml(post.slug)}" aria-label="Move up"${index === 0 ? ' disabled' : ''}>&uarr;</button>
          <button data-move="down" data-slug="${escapeHtml(post.slug)}" aria-label="Move down"${index === total - 1 ? ' disabled' : ''}>&darr;</button>
        </span>
      </div>
    </article>`
}

function renderRows() {
  const rows = $('post-rows')
  const visible = visiblePosts()

  if (!state.posts.length) {
    rows.innerHTML = '<div class="empty">Nothing here yet.<br><button class="btn" id="import-old">Bring in the 18 existing entries</button></div>'
    return wireImport()
  }

  if (!visible.length) {
    rows.innerHTML = `<p class="empty">${state.tab === 'draft' ? 'No drafts.' : 'Nothing published.'}</p>`
    return
  }

  rows.innerHTML = visible.map((post, i) => postMarkup(post, i, visible.length)).join('')
  wireRows()
}

const CARD_FIELDS = [
  'slug', 'title', 'excerpt', 'category', 'layout', 'kind', 'image',
  'linkLabel', 'videoUrl', 'externalUrl', 'status', 'position', 'updatedAt'
]

function mergePost(post) {
  const card = CARD_FIELDS.reduce((out, field) => {
    if (post[field] !== undefined) out[field] = post[field]
    return out
  }, {})

  const at = state.posts.findIndex((item) => item.slug === card.slug)
  if (at === -1) state.posts.push(card)
  else state.posts[at] = { ...state.posts[at], ...card }

  updateCounts(state.posts)
}

function dropPost(slug) {
  state.posts = state.posts.filter((item) => item.slug !== slug)
  updateCounts(state.posts)
}

async function loadPosts() {
  $('post-rows').innerHTML = '<p class="empty">Loading.</p>'

  try {
    const { posts } = await api('/api/admin/posts')
    state.posts = posts
    updateCounts(posts)
    renderRows()
  } catch (problem) {
    $('post-rows').innerHTML = `<p class="empty">${escapeHtml(problem.message)}</p>`
  }
}

async function saveOrder(slugs) {
  try {
    await api('/api/admin/reorder', { method: 'POST', body: JSON.stringify({ slugs }) })
    state.posts.sort((a, b) => slugs.indexOf(a.slug) - slugs.indexOf(b.slug))
    state.posts.forEach((post, position) => { post.position = position })
    renderRows()
    flash('Order saved.')
  } catch (problem) {
    flash(problem.message)
  }
}

// Reordering happens inside whichever filter is open. Anything outside it keeps its own
// order, so publishing a draft later drops it exactly where it was placed.
function partition() {
  const inTab = visiblePosts().map((post) => post.slug)
  const others = state.posts.filter((post) => !inTab.includes(post.slug)).map((post) => post.slug)
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
  const rows = $('post-rows')
  const rowNodes = Array.from(rows.querySelectorAll('.post-row'))

  rowNodes.forEach((row) => {
    row.addEventListener('dragstart', () => {
      draggedSlug = row.dataset.slug
      row.classList.add('dragging')
    })

    row.addEventListener('dragend', () => {
      row.classList.remove('dragging')
      rowNodes.forEach((other) => other.classList.remove('over'))
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

  rows.querySelectorAll('[data-move]').forEach((button) => {
    button.addEventListener('click', () => moveBy(button.dataset.slug, button.dataset.move === 'up' ? -1 : 1))
  })
  rows.querySelectorAll('[data-edit]').forEach((button) => {
    button.addEventListener('click', () => openEditor(button.dataset.edit))
  })
  rows.querySelectorAll('[data-remove]').forEach((button) => {
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
      flash(`${imported} entries imported.`)
      setTimeout(loadPosts, 1200)
    } catch (problem) {
      flash(problem.message)
      button.disabled = false
      button.textContent = 'Bring in the 18 existing entries'
    }
  })
}

async function removePost(slug) {
  const post = state.posts.find((item) => item.slug === slug)

  const sure = await ask({ title: 'Delete entry', body: post ? post.title : slug, confirmLabel: 'Delete' })
  if (!sure) return

  try {
    await api('/api/admin/posts?slug=' + encodeURIComponent(slug), { method: 'DELETE' })
    dropPost(slug)
    renderRows()
    flash('Deleted.')
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

// Wide screens keep the panel docked beside the writing area. Small screens move that
// same panel into a real dialog, so opening it cannot be defeated by layout.
const compact = window.matchMedia('(max-width: 900px), (hover: none)')
const settingsDock = $('settings')
const settingsSheet = $('settings-sheet')
const settingsPanel = document.querySelector('.side-panel')

function openSettings() {
  if (!compact.matches || settingsSheet.open) return
  settingsSheet.appendChild(settingsPanel)
  settingsSheet.showModal()
}

function closeSettings() {
  if (settingsSheet.open) settingsSheet.close()
}

settingsSheet.addEventListener('close', () => settingsDock.appendChild(settingsPanel))
settingsSheet.addEventListener('click', (event) => {
  if (event.target === settingsSheet) closeSettings()
})

compact.addEventListener('change', () => {
  if (!compact.matches) closeSettings()
})

$('open-settings').addEventListener('click', openSettings)
$('close-settings').addEventListener('click', closeSettings)

function applyKind() {
  const kind = $('f-kind').value
  $('wrap-video').classList.toggle('hidden', kind !== 'video')
  $('wrap-external').classList.toggle('hidden', kind !== 'external')
  $('body-card').classList.toggle('hidden', kind !== 'article')
  hideToolbar()
}

function setCover(url) {
  $('cover-preview').src = url || ''
  $('cover-preview').classList.toggle('hidden', !url)
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

  $('save-state').textContent = post.slug ? 'Saved' : ''
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

$('editor-back').addEventListener('click', () => {
  showView('posts')
  renderRows()
})

$('editor-save').addEventListener('click', async () => {
  const button = $('editor-save')
  button.disabled = true
  $('save-state').textContent = 'Saving'

  try {
    const { post } = await api('/api/admin/posts', { method: 'POST', body: JSON.stringify(collect()) })
    state.editing = post.slug
    state.coverUrl = post.image || null
    mergePost(post)
    $('save-state').textContent = 'Saved'
    $('editor-delete').classList.remove('hidden')
    flash(post.status === 'published' ? 'Saved. It appears on the news page within a minute.' : 'Saved as a draft.')
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
  if (!state.posts.some((post) => post.slug === slug)) showView('posts')
})

const editable = $('f-content')
const selBar = $('toolbar')

function hideToolbar() {
  selBar.classList.add('hidden')
}

// Sits above the selection, the way a writing app does, and only while text is selected.
function placeToolbar() {
  const selection = window.getSelection()

  if (
    $('f-kind').value !== 'article' ||
    !selection ||
    selection.isCollapsed ||
    !selection.rangeCount ||
    !editable.contains(selection.anchorNode)
  ) {
    return hideToolbar()
  }

  const rect = selection.getRangeAt(0).getBoundingClientRect()
  if (!rect.width && !rect.height) return hideToolbar()

  selBar.classList.remove('hidden')

  const half = selBar.offsetWidth / 2
  const centre = rect.left + window.scrollX + rect.width / 2
  const edge = 10

  selBar.style.left = Math.min(Math.max(centre, half + edge), window.innerWidth - half - edge) + 'px'
  selBar.style.top = rect.top + window.scrollY + 'px'
}

document.addEventListener('selectionchange', placeToolbar)

// A touch selection is not settled until the gesture ends, so re-check afterwards.
;['touchend', 'pointerup'].forEach((type) =>
  editable.addEventListener(type, () => setTimeout(placeToolbar, 60))
)
window.addEventListener('resize', placeToolbar)
window.addEventListener('scroll', () => { if (!selBar.classList.contains('hidden')) placeToolbar() }, { passive: true })

// Buttons must not steal the caret, or formatting would apply to nothing.
selBar.addEventListener('mousedown', (event) => {
  if (event.target.closest('button')) event.preventDefault()
})

document.querySelectorAll('#toolbar [data-cmd]').forEach((button) => {
  button.addEventListener('click', () => {
    document.execCommand(button.dataset.cmd, false, null)
    placeToolbar()
  })
})

document.querySelectorAll('#toolbar [data-block]').forEach((button) => {
  button.addEventListener('click', () => {
    document.execCommand('formatBlock', false, button.dataset.block)
    placeToolbar()
  })
})

editable.addEventListener('paste', (event) => {
  event.preventDefault()
  const text = (event.clipboardData || window.clipboardData).getData('text/plain')
  document.execCommand('insertText', false, text)
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

// One place to get an image: reuse anything already uploaded, or add a new one.
const chooseImage = (() => {
  const dialog = $('picker')
  let settle = null

  const close = (value) => {
    const done = settle
    settle = null
    if (dialog.open) dialog.close()
    if (done) done(value)
  }

  $('picker-close').addEventListener('click', () => close(null))
  dialog.addEventListener('cancel', (event) => { event.preventDefault(); close(null) })
  dialog.addEventListener('close', () => close(null))

  $('picker-upload').addEventListener('click', async () => {
    const file = await pickFile()
    if (!file) return
    try {
      close(await uploadImage(file))
    } catch (problem) {
      flash(problem.message)
    }
  })

  return () =>
    new Promise((resolve) => {
      settle = resolve
      const grid = $('picker-grid')
      grid.innerHTML = '<p class="picker-empty">Loading.</p>'
      dialog.showModal()

      api('/api/admin/media')
        .then(({ media }) => {
          grid.innerHTML = media.length
            ? media.map((item) => `<button type="button" data-pick="${escapeHtml(item.url)}" title="${escapeHtml(item.name)}"><img src="${escapeHtml(item.url)}" alt="" loading="lazy"></button>`).join('')
            : '<p class="picker-empty">No images yet. Use Upload new.</p>'

          grid.querySelectorAll('[data-pick]').forEach((button) => {
            button.addEventListener('click', () => close(button.dataset.pick))
          })
        })
        .catch((problem) => {
          grid.innerHTML = `<p class="picker-empty">${escapeHtml(problem.message)}</p>`
        })
    })
})()

$('cover-pick').addEventListener('click', async () => {
  const url = await chooseImage()
  if (!url) return
  state.coverUrl = url
  setCover(url)
})

$('cover-clear').addEventListener('click', () => {
  state.coverUrl = null
  setCover(null)
})

const dropZone = $('cover-drop')
;['dragenter', 'dragover'].forEach((type) =>
  dropZone.addEventListener(type, (event) => { event.preventDefault(); dropZone.classList.add('drop') })
)
;['dragleave', 'drop'].forEach((type) => dropZone.addEventListener(type, () => dropZone.classList.remove('drop')))

dropZone.addEventListener('drop', async (event) => {
  event.preventDefault()
  const file = event.dataTransfer.files[0]
  if (!file) return
  try {
    const url = await uploadImage(file)
    state.coverUrl = url
    setCover(url)
    flash('Cover image added.')
  } catch (problem) {
    flash(problem.message)
  }
})

$('tb-link').addEventListener('click', async () => {
  const selection = window.getSelection()
  const range = selection.rangeCount ? selection.getRangeAt(0) : null

  const href = await ask({ title: 'Add a link', confirmLabel: 'Add link', input: { label: 'Address', placeholder: 'https://' } })
  if (!href) return

  editable.focus()
  if (range) {
    selection.removeAllRanges()
    selection.addRange(range)
  }
  document.execCommand('createLink', false, href)
})

$('tb-image').addEventListener('click', async () => {
  const selection = window.getSelection()
  const range = selection.rangeCount && editable.contains(selection.anchorNode) ? selection.getRangeAt(0) : null

  const url = await chooseImage()
  if (!url) return

  editable.focus()
  if (range) {
    selection.removeAllRanges()
    selection.addRange(range)
  }
  document.execCommand('insertHTML', false, `<img src="${escapeHtml(url)}" alt="">`)
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
          <button data-drop="${escapeHtml(item.url)}">Delete</button>
        </figcaption>
      </figure>`).join('')
      : '<p class="empty">No images uploaded yet.</p>'

    grid.querySelectorAll('[data-drop]').forEach((button) => {
      button.addEventListener('click', async () => {
        const sure = await ask({ title: 'Delete image', body: 'Any entry still using it will lose it.', confirmLabel: 'Delete' })
        if (!sure) return

        try {
          await api('/api/admin/media?url=' + encodeURIComponent(button.dataset.drop), { method: 'DELETE' })
          flash('Image deleted.')
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
    flash('Image uploaded.')
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

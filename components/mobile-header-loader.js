const MOBILE_HEADER_HTML = '/components/mobile-header.html'
const MOBILE_HEADER_CSS = '/components/mobile-header-styles.css'

function loadMobileCSS() {
  if (document.querySelector(`link[href^="${MOBILE_HEADER_CSS}"]`)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = `${MOBILE_HEADER_CSS}?v=${Date.now()}`
  document.head.appendChild(link)
}

function loadMobileHTML() {
  const container = document.getElementById('mobile-header-container')
  if (!container) return

  fetch(`${MOBILE_HEADER_HTML}?v=${Date.now()}`)
    .then(res => res.text())
    .then(html => {
      container.innerHTML = html
      initMobileHeader()
    })
    .catch(() => {})
}

function initMobileHeader() {
  const menuToggle = document.querySelector('.mobile-menu-toggle')
  const closeBtn = document.querySelector('.mobile-close-btn')
  const overlay = document.getElementById('mobile-menu-overlay')
  const accordions = document.querySelectorAll('.mobile-menu-accordion-toggle')

  function toggleMenu() {
    const isOpen = overlay.classList.contains('open')
    if (isOpen) {
      overlay.classList.remove('open')
      document.body.style.overflow = ''
    } else {
      overlay.classList.add('open')
      document.body.style.overflow = 'hidden'
    }
  }

  if (menuToggle) menuToggle.addEventListener('click', toggleMenu)
  if (closeBtn) closeBtn.addEventListener('click', toggleMenu)

  accordions.forEach(acc => {
    acc.addEventListener('click', function () {
      this.classList.toggle('active')
      const content = this.nextElementSibling
      if (content) {
        content.style.display = content.style.display === 'flex' ? 'none' : 'flex'
      }
    })
  })
}

document.addEventListener('DOMContentLoaded', () => {
  loadMobileCSS()
  loadMobileHTML()
})

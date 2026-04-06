function loadFooter() {
  fetch(`/components/footer.html?t=${Date.now()}`)
    .then(response => {
      if (!response.ok) throw new Error('Footer not found')
      return response.text()
    })
    .then(html => {
      let container = document.getElementById('footer-container')
      if (!container) {
        container = document.createElement('div')
        container.id = 'footer-container'
        document.body.appendChild(container)
      }
      container.innerHTML = html
    })
    .catch(() => {})
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadFooter)
} else {
  loadFooter()
}

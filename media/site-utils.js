if (window.sessionStorage) {
  var pageKey = 'scrollY_' + location.pathname

  window.addEventListener('beforeunload', function () {
    sessionStorage.setItem(pageKey, String(window.scrollY))
  })

  window.addEventListener('pageshow', function (e) {
    if (!e.persisted) {
      var navEntry = performance.getEntriesByType('navigation')[0]
      if (!navEntry || navEntry.type !== 'back_forward') return
    }

    var saved = sessionStorage.getItem(pageKey)
    if (!saved) return

    var y = parseInt(saved, 10)
    if (isNaN(y) || y === 0) return

    var attempts = 0
    var restore = setInterval(function () {
      attempts++
      if (window.lenis) {
        window.lenis.scrollTo(y, { immediate: true })
        clearInterval(restore)
      } else if (attempts > 20) {
        window.scrollTo(0, y)
        clearInterval(restore)
      }
    }, 50)
  })
}

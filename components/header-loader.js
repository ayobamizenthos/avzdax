;(function () {
  const HEADER_HTML_PATH = '/components/header.html'
  const HEADER_CSS_PATH = '/components/header-styles.css'

  function loadHeaderStyles() {
    if (document.querySelector(`link[href="${HEADER_CSS_PATH}"]`)) return Promise.resolve()

    return new Promise((resolve, reject) => {
      const link = document.createElement('link')
      link.rel = 'stylesheet'
      link.href = HEADER_CSS_PATH
      link.onload = resolve
      link.onerror = reject
      document.head.appendChild(link)
    })
  }

  async function loadHeaderHTML(container) {
    try {
      const response = await fetch(HEADER_HTML_PATH)
      if (!response.ok) throw new Error(`Header load failed: ${response.status}`)
      container.innerHTML = await response.text()
      return true
    } catch (error) {
      return false
    }
  }

  const searchIndex = [
    {
      title: 'PRIMUS',
      description: 'Behavioral AI Platform — Predictive threat detection',
      url: 'primus.html',
      category: 'Platform',
    },
    {
      title: 'TELETRAAN',
      description: 'Command UI — Digital Twin of Reality',
      url: 'teletraan.html',
      category: 'Platform',
    },
    {
      title: 'NEST',
      description: 'Oversight Station — Centralized monitoring',
      url: 'nest.html',
      category: 'Platform',
    },
    {
      title: 'TRION',
      description: 'Optical Sensing — Advanced surveillance hardware',
      url: 'trion.html',
      category: 'Hardware',
    },
    {
      title: 'OBEX EDGE',
      description: 'Architectural Imaging — 3D spatial capture',
      url: 'obex.html',
      category: 'Hardware',
    },
    {
      title: 'OBEX FLEET',
      description: 'Predictive Mobility Intelligence — Fleet surveillance',
      url: 'obex-fleet.html',
      category: 'Hardware',
    },
    {
      title: 'ARCLIGHT',
      description: 'Urban Tower — City-wide monitoring',
      url: 'arclight.html',
      category: 'Hardware',
    },
    {
      title: 'WHITE PAPERS',
      description: 'Technical documentation and research',
      url: 'whitepaper.html',
      category: 'Intelligence',
    },
    {
      title: 'NEWSROOM',
      description: 'Latest updates and press releases',
      url: 'news.html',
      category: 'Intelligence',
    },
    {
      title: 'CASE STUDIES',
      description: 'Industry solutions and implementations',
      url: 'industries.html',
      category: 'Intelligence',
    },
    {
      title: 'ABOUT',
      description: 'Company overview and mission',
      url: 'about.html',
      category: 'Corporate',
    },
    {
      title: 'CAREERS',
      description: 'Join the AVZDAX team',
      url: 'careers.html',
      category: 'Corporate',
    },
    {
      title: 'CONTACT',
      description: 'Get in touch with us',
      url: 'contact.html',
      category: 'Corporate',
    },
    {
      title: 'ETHICS POLICY',
      description: 'Our commitment to responsible AI',
      url: 'ethics.html',
      category: 'Corporate',
    },
    {
      title: 'HOME',
      description: 'AVZDAX Sovereign Predictive Defense',
      url: 'index.html',
      category: 'Home',
    },
    {
      title: 'SENTINEL',
      description: 'AI Defense System (Coming Soon)',
      url: '#',
      category: 'Platform',
    },
    {
      title: 'XETRON',
      description: 'Advanced Defense System (Coming Soon)',
      url: '#',
      category: 'Platform',
    },
    {
      title: 'PREDICTIVE SURVEILLANCE',
      description: 'Next-gen threat prediction',
      url: 'index.html',
      category: 'Technology',
    },
    {
      title: 'NEURAL MESH',
      description: 'Global AI infrastructure',
      url: 'primus.html',
      category: 'Technology',
    },
    {
      title: 'PEACETECH',
      description: 'Technology for peace',
      url: 'index.html',
      category: 'Mission',
    },
    {
      title: 'SOVEREIGN DEFENSE',
      description: 'National security solutions',
      url: 'industries.html',
      category: 'Solutions',
    },
    {
      title: 'SMART CITY',
      description: 'Urban intelligence systems',
      url: 'arclight.html',
      category: 'Solutions',
    },
    {
      title: 'BORDER SECURITY',
      description: 'Perimeter protection',
      url: 'trion.html',
      category: 'Solutions',
    },
    {
      title: 'CRITICAL INFRASTRUCTURE',
      description: 'Asset protection',
      url: 'obex.html',
      category: 'Solutions',
    },
  ]

  function escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  function highlightText(text, query) {
    if (!query) return text
    return text.replace(
      new RegExp(`(${escapeRegex(query)})`, 'gi'),
      '<span class="search-highlight">$1</span>'
    )
  }

  function filterSearch(query) {
    return searchIndex.filter(item => {
      return `${item.title} ${item.description} ${item.category}`.toLowerCase().includes(query)
    })
  }

  function renderSearchResults(results, query) {
    if (results.length === 0) {
      return '<div class="text-white/30 text-2xl font-black uppercase tracking-widest text-center py-20">NO INTEL FOUND</div>'
    }
    return results
      .map(
        item => `
    <a href="${item.url}" class="group block py-4 border-b border-white/5 hover:border-white/20 transition-all duration-300" onclick="toggleSearch()">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-xl md:text-2xl font-black uppercase tracking-tight text-white group-hover:text-green-500 transition-colors">${highlightText(item.title, query)}</div>
          <div class="text-xs text-white/40 group-hover:text-white/60 uppercase tracking-widest mt-1">${highlightText(item.description, query)}</div>
        </div>
        <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 -translate-x-4 group-hover:translate-x-0 transform">
          <svg class="text-green-500 w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
        </div>
      </div>
    </a>
  `
      )
      .join('')
  }

  function initializeHeader() {
    const mobileToggle = document.querySelector('.mobile-menu-toggle-modern')
    const mobileOverlay = document.getElementById('mobile-menu-overlay')

    if (mobileToggle && mobileOverlay) {
      mobileToggle.addEventListener('click', function () {
        const isOpen = mobileOverlay.style.display === 'flex'
        if (isOpen) {
          mobileOverlay.style.display = 'none'
          document.body.style.overflow = ''
          mobileToggle.classList.remove('open')
          mobileToggle.setAttribute('aria-expanded', 'false')
        } else {
          mobileOverlay.style.display = 'flex'
          document.body.style.overflow = 'hidden'
          mobileToggle.classList.add('open')
          mobileToggle.setAttribute('aria-expanded', 'true')
        }
      })
    }

    window.closeMobileMenu = function () {
      if (mobileOverlay) {
        mobileOverlay.style.display = 'none'
        document.body.style.overflow = ''
      }
      if (mobileToggle) {
        mobileToggle.classList.remove('open')
        mobileToggle.setAttribute('aria-expanded', 'false')
      }
    }

    document.querySelectorAll('.nav-toggle').forEach(toggle => {
      toggle.addEventListener('click', function () {
        const dropdown = this.nextElementSibling
        const chevron = this.querySelector('.nav-chevron')

        document.querySelectorAll('.nav-toggle').forEach(other => {
          if (other !== toggle) {
            const otherDropdown = other.nextElementSibling
            const otherChevron = other.querySelector('.nav-chevron')
            if (otherDropdown) otherDropdown.classList.remove('open')
            if (otherChevron) otherChevron.style.transform = 'rotate(0deg)'
            other.classList.remove('active')
          }
        })

        if (dropdown) dropdown.classList.toggle('open')
        if (chevron) {
          chevron.style.transform = dropdown.classList.contains('open')
            ? 'rotate(180deg)'
            : 'rotate(0deg)'
        }
        this.classList.toggle('active')
      })
    })

    window.toggleSearch = function () {
      const searchOverlay = document.getElementById('search-overlay')
      if (!searchOverlay) return
      const isOpen = searchOverlay.classList.contains('active')
      if (isOpen) {
        searchOverlay.classList.remove('active')
        searchOverlay.style.opacity = '0'
        searchOverlay.style.pointerEvents = 'none'
        document.body.style.overflow = ''
      } else {
        searchOverlay.classList.add('active')
        searchOverlay.style.opacity = '1'
        searchOverlay.style.pointerEvents = 'auto'
        document.body.style.overflow = 'hidden'
        const searchInput = document.getElementById('search-input')
        if (searchInput) setTimeout(() => searchInput.focus(), 300)
      }
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        const searchOverlay = document.getElementById('search-overlay')
        const mobileOverlay = document.getElementById('mobile-menu-overlay')
        if (searchOverlay && searchOverlay.classList.contains('active')) window.toggleSearch()
        if (mobileOverlay && mobileOverlay.style.display === 'flex') window.closeMobileMenu()
      }
    })

    const nav = document.getElementById('main-nav')
    const mobileNavBar = document.querySelector('.mobile-nav-bar')

    window.addEventListener('scroll', function () {
      if (nav) {
        if (window.scrollY > 100) nav.classList.add('nav-scrolled')
        else nav.classList.remove('nav-scrolled')
      }
      if (mobileNavBar) {
        if (window.scrollY > 80) mobileNavBar.classList.add('mobile-scrolled')
        else mobileNavBar.classList.remove('mobile-scrolled')
      }
    })

    window.showPreview = function (product) {
      const previews = document.querySelectorAll('.menu-preview-img')
      const defaultPreview = document.getElementById('preview-default')
      previews.forEach(p => p.classList.remove('active'))
      if (defaultPreview) defaultPreview.style.opacity = '0'
      const preview = document.getElementById(`p-${product}`)
      if (preview) preview.classList.add('active')
    }

    const ecosystemMenuItem = document.querySelector('.nav-item.group')
    if (ecosystemMenuItem) {
      ecosystemMenuItem.addEventListener('mouseleave', function () {
        document.querySelectorAll('.menu-preview-img').forEach(p => p.classList.remove('active'))
        const defaultPreview = document.getElementById('preview-default')
        if (defaultPreview) defaultPreview.style.opacity = '1'
      })
    }

    // Desktop search
    const searchInput = document.getElementById('search-input')
    const searchResultsContainer = document.getElementById('search-results')
    const searchResultsList = document.getElementById('search-results-list')
    const searchDefaultGrid = document.getElementById('search-default-grid')

    if (searchInput) {
      searchInput.addEventListener('input', function (e) {
        const query = e.target.value.trim().toLowerCase()
        if (query.length === 0) {
          if (searchResultsContainer) searchResultsContainer.classList.add('hidden')
          if (searchDefaultGrid) searchDefaultGrid.style.display = ''
          return
        }
        const results = filterSearch(query)
        if (searchResultsList && searchResultsContainer) {
          searchResultsList.innerHTML = renderSearchResults(results, query)
          searchResultsContainer.classList.remove('hidden')
          if (searchDefaultGrid) searchDefaultGrid.style.display = 'none'
        }
      })

      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault()
          const query = e.target.value.trim().toLowerCase()
          if (query.length > 0) {
            const results = filterSearch(query)
            if (results.length > 0 && results[0].url !== '#') window.location.href = results[0].url
          }
        }
      })

      const searchIconBtn = document.getElementById('search-icon-btn')
      if (searchIconBtn) {
        searchIconBtn.addEventListener('click', function (e) {
          e.preventDefault()
          e.stopPropagation()
          const query = searchInput.value.trim().toLowerCase()
          if (query.length > 0) {
            const results = filterSearch(query)
            if (results.length > 0 && results[0].url !== '#') window.location.href = results[0].url
          }
        })
      }
    }

    // Mobile search — shares filterSearch and renderSearchResults
    const mobileSearchInput = document.getElementById('mobile-search-input')
    const mobileSearchResultsContainer = document.getElementById('mobile-search-results')
    const mobileSearchResultsList = document.getElementById('mobile-search-results-list')
    const mobileSearchResultsCount = document.getElementById('mobile-search-results-count')
    const mobileNavSections = document.querySelector('.minimalist-nav')
    const mobileCTA = document.querySelector('.mobile-nav-content > .mt-8')

    if (mobileSearchInput) {
      mobileSearchInput.addEventListener('input', function (e) {
        const query = e.target.value.trim().toLowerCase()

        if (query.length === 0) {
          if (mobileSearchResultsContainer) mobileSearchResultsContainer.classList.add('hidden')
          if (mobileNavSections) mobileNavSections.style.display = ''
          if (mobileCTA) mobileCTA.style.display = ''
          return
        }

        const results = filterSearch(query)

        if (mobileSearchResultsList && mobileSearchResultsContainer) {
          if (mobileSearchResultsCount) {
            mobileSearchResultsCount.textContent =
              results.length === 0
                ? '0 RESULTS'
                : `${results.length} RESULT${results.length !== 1 ? 'S' : ''}`
          }

          if (results.length === 0) {
            mobileSearchResultsList.innerHTML =
              '<div class="search-no-results py-8"><div class="text-lg font-bold uppercase tracking-wide text-white/50">NO RESULTS FOUND</div><div class="text-sm text-white/40 mt-2">Try adjusting your search terms</div></div>'
          } else {
            mobileSearchResultsList.innerHTML = results
              .map(
                item => `
            <a href="${item.url}" class="search-result-item block py-4 border-b border-white/5" onclick="closeMobileMenu()">
              <div class="search-result-content">
                <div class="search-result-title text-base font-bold uppercase tracking-wide text-white">${highlightText(item.title, query)}</div>
                <div class="search-result-description text-xs text-white/50 mt-1">${highlightText(item.description, query)}</div>
              </div>
              <div class="search-result-category text-[9px] font-mono text-white/30 uppercase tracking-widest mt-2">${item.category}</div>
            </a>
          `
              )
              .join('')
          }

          mobileSearchResultsContainer.classList.remove('hidden')
          if (mobileNavSections) mobileNavSections.style.display = 'none'
          if (mobileCTA) mobileCTA.style.display = 'none'
        }
      })

      mobileSearchInput.addEventListener('keypress', function (e) {
        if (e.key === 'Enter') {
          const query = e.target.value.trim().toLowerCase()
          if (query.length > 0) {
            const results = filterSearch(query)
            if (results.length > 0 && results[0].url !== '#') window.location.href = results[0].url
          }
        }
      })
    }
  }

  async function loadHeader() {
    let container = document.getElementById('header-container')

    if (!container) {
      container = document.createElement('div')
      container.id = 'header-container'
      document.body.insertBefore(container, document.body.firstChild)
    }

    await loadHeaderStyles()
    const success = await loadHeaderHTML(container)
    if (success) initializeHeader()
    return success
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (document.getElementById('header-container')) loadHeader()
    })
  } else {
    if (document.getElementById('header-container')) loadHeader()
  }

  window.loadAVZDAXHeader = loadHeader
})()

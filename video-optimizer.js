class VideoOptimizer {
  constructor() {
    this.videos = []
    this.observers = new Map()
    this.init()
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setupVideos())
    } else {
      this.setupVideos()
    }
  }

  setupVideos() {
    const lazyVideos = document.querySelectorAll('video[data-lazy-video]')

    lazyVideos.forEach(video => {
      this.setupLazyVideo(video)
    })

    const autoplayVideos = document.querySelectorAll('video[autoplay]')
    autoplayVideos.forEach(video => {
      this.optimizeAutoplayVideo(video)
    })

    this.setupScrollVideos()
  }

  setupLazyVideo(video) {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            this.loadVideo(video)
            observer.unobserve(video)
          }
        })
      },
      {
        rootMargin: '200px',
      }
    )

    observer.observe(video)
    this.observers.set(video, observer)
  }

  loadVideo(video) {
    const src = video.dataset.src || video.getAttribute('src')

    if (src && !video.src) {
      if (video.hasAttribute('data-critical')) {
        video.setAttribute('preload', 'auto')
      }

      video.src = src
      video.load()

      if (video.hasAttribute('autoplay')) {
        video.play().catch(err => {})
      }
    }
  }

  optimizeAutoplayVideo(video) {
    if (!video.hasAttribute('playsinline')) video.setAttribute('playsinline', '')
    if (!video.hasAttribute('muted')) video.muted = true

    const hasPoster = video.hasAttribute('poster')

    if (!hasPoster && !video.style.opacity) {
      video.style.opacity = '0'
    }

    video.addEventListener(
      'canplay',
      () => {
        video.style.opacity = '1'
        video.style.transition = 'opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
      },
      { once: true }
    )

    video.addEventListener('error', () => {
      video.style.display = 'none'
    })
  }

  setupScrollVideos() {
    const videoWrappers = document.querySelectorAll('.scene-video-wrapper, .video-bg, .cap-section')

    videoWrappers.forEach(wrapper => {
      const video = wrapper.querySelector('video')
      if (!video) return

      const observer = new IntersectionObserver(
        entries => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              if (video.paused && video.src) {
                video.play().catch(() => {})
              }
            } else {
              if (!video.paused && video.src) {
                video.pause()
              }
            }
          })
        },
        {
          threshold: 0.1,
        }
      )

      observer.observe(wrapper)
    })
  }
}

window.avzdaxVideoOptimizer = new VideoOptimizer()

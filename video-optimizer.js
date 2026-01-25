/**
 * AVZDAX VIDEO OPTIMIZATION SYSTEM
 * Implements lazy loading, intersection observer, and performance optimization
 */

class VideoOptimizer {
    constructor() {
        this.videos = [];
        this.observers = new Map();
        this.init();
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupVideos());
        } else {
            this.setupVideos();
        }
    }

    setupVideos() {
        // Find all videos with lazy loading attribute
        const lazyVideos = document.querySelectorAll('video[data-lazy-video]');
        
        lazyVideos.forEach(video => {
            this.setupLazyVideo(video);
        });

        // Optimize all autoplay videos
        const autoplayVideos = document.querySelectorAll('video[autoplay]:not([data-lazy-video])');
        autoplayVideos.forEach(video => {
            this.optimizeAutoplayVideo(video);
        });

        // Setup intersection observer for scroll-triggered videos
        this.setupScrollVideos();
    }

    setupLazyVideo(video) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadVideo(video);
                    observer.unobserve(video);
                }
            });
        }, {
            rootMargin: '50px' // Start loading 50px before entering viewport
        });

        observer.observe(video);
        this.observers.set(video, observer);
    }

    loadVideo(video) {
        // Get source from data attribute
        const src = video.dataset.src || video.getAttribute('src');
        
        if (src && !video.src) {
            video.src = src;
            video.load();
            
            // Auto-play once loaded if it had autoplay attribute
            if (video.hasAttribute('autoplay')) {
                video.play().catch(err => {
                    console.log('Autoplay prevented:', err);
                });
            }
        }
    }

    optimizeAutoplayVideo(video) {
        // Only dim if there is no poster image
        const hasPoster = video.hasAttribute('poster');
        
        if (!hasPoster) {
            video.addEventListener('loadstart', () => {
                video.style.opacity = '0';
            });
        }

        video.addEventListener('canplay', () => {
            video.style.opacity = '1';
            video.style.transition = 'opacity 0.8s ease';
        });

        // Handle errors gracefully
        video.addEventListener('error', (e) => {
            console.error('Video load error:', video.src, e);
            video.style.opacity = '0.5';
        });
    }

    setupScrollVideos() {
        // For videos in scroll-triggered sections (like product highlights)
        const scrollSections = document.querySelectorAll('[id^="act-"]');
        
        scrollSections.forEach(section => {
            const video = section.querySelector('video');
            if (!video) return;

            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        if (video.paused && video.src) {
                            video.play().catch(() => {});
                        }
                    } else {
                        // Pause videos that are out of view to save resources
                        if (!video.paused) {
                            video.pause();
                        }
                    }
                });
            }, {
                threshold: 0.5 // Video must be 50% visible
            });

            observer.observe(section);
        });
    }
}

// Initialize the optimizer
new VideoOptimizer();

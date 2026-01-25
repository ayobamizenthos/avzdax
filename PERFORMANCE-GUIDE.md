# AVZDAX Performance Optimization Guide

## Silicon Valley-Grade Video Compression

Your videos are the #1 cause of slow loading. Here's how to fix them:

---

## 🎬 STEP 1: Install FFmpeg

1. Download from: https://ffmpeg.org/download.html
2. Or use Chocolatey: `choco install ffmpeg`
3. Or use Winget: `winget install ffmpeg`

---

## 🖼️ STEP 2: Create Hero Poster Image

Run this command to extract a frame from your hero video:

```bash
ffmpeg -i media/homepage-hero.mp4 -vframes 1 -q:v 2 media/hero-poster.jpg
```

---

## 📦 STEP 3: Compress Your Videos

### Homepage Hero (24MB → ~4MB)

```bash
ffmpeg -i media/homepage-hero.mp4 -c:v libx264 -crf 28 -preset slow -movflags +faststart -an media/homepage-hero-optimized.mp4
```

### Footer Video (24MB → ~3MB)

```bash
ffmpeg -i media/XBAThero-web.mp4 -c:v libx264 -crf 32 -preset slow -movflags +faststart -an -vf "scale=1280:-1" media/XBAThero-web-optimized.mp4
```

### Create WebM versions (even smaller, better for web)

```bash
ffmpeg -i media/homepage-hero.mp4 -c:v libvpx-vp9 -crf 35 -b:v 0 -an media/homepage-hero.webm
```

---

## ⚡ STEP 4: Update HTML to use optimized videos

After compressing, update your video tags to include both formats:

```html
<video
  autoplay
  muted
  loop
  playsinline
  preload="metadata"
  poster="/media/hero-poster.jpg"
>
  <source src="/media/homepage-hero.webm" type="video/webm" />
  <source src="/media/homepage-hero-optimized.mp4" type="video/mp4" />
</video>
```

---

## 🎯 CRF Quality Guide

| CRF Value | Quality       | Best For                           |
| --------- | ------------- | ---------------------------------- |
| 18-22     | High quality  | Hero videos, featured content      |
| 23-28     | Good quality  | General videos                     |
| 29-35     | Lower quality | Background videos, blurred content |

---

## 📊 Expected Results

| Video             | Original | Optimized | Savings |
| ----------------- | -------- | --------- | ------- |
| homepage-hero.mp4 | 24.5 MB  | ~4 MB     | 80%     |
| XBAThero-web.mp4  | 23.7 MB  | ~3 MB     | 87%     |
| primus-hero.mp4   | 34.5 MB  | ~5 MB     | 85%     |

---

## 🚀 Quick Batch Script

Save this as `compress-videos.bat` and run it:

```batch
@echo off
echo Compressing AVZDAX videos for Silicon Valley-grade performance...

ffmpeg -i media/homepage-hero.mp4 -vframes 1 -q:v 2 media/hero-poster.jpg
echo Created hero poster image

ffmpeg -i media/homepage-hero.mp4 -c:v libx264 -crf 26 -preset slow -movflags +faststart -an media/homepage-hero-optimized.mp4
echo Compressed homepage hero

ffmpeg -i media/XBAThero-web.mp4 -c:v libx264 -crf 32 -preset slow -movflags +faststart -an -vf "scale=1280:-1" media/XBAThero-web-optimized.mp4
echo Compressed footer video

echo Done! Now update your HTML to use the optimized videos.
```

---

## ✅ Performance Optimizations Already Applied

1. ✅ Hero video: `preload="auto"` → `preload="metadata"`
2. ✅ Hero video: Added poster image reference
3. ✅ Footer video: Removed autoplay, added lazy loading
4. ✅ Canvas animation: Reduced particles 100 → 30
5. ✅ Canvas animation: Pauses when footer not visible
6. ✅ Canvas animation: Throttled from 30fps → 20fps
7. ✅ IntersectionObserver: Videos pause when off-screen

---

## 📱 Mobile-Specific Tips

For mobile, consider:

- Using even smaller video files (720p max)
- Adding `poster` attribute to show static image while loading
- Using `loading="lazy"` on images below the fold

# Homepage Hero Video Optimization Guide

## Overview
This implementation provides a robust video optimization system that ensures smooth playback of your 88MB homepage-hero.mov across all devices and network conditions.

## What Was Implemented

### 1. **Multiple Video Format Support**
- **AV1 (Primary)**: `homepage-hero-av1.mp4` - Most efficient, best quality/size ratio
- **VP9 (Fallback)**: `homepage-hero-vp9.webm` - Chrome/Firefox optimized
- **H.264 (Legacy)**: `homepage-hero-h264.mp4` - Universal compatibility

### 2. **Performance Optimizations**
- Hardware acceleration via CSS transforms
- Progressive loading with `preload="metadata"`
- Connection quality detection
- Automatic fallback for slow networks
- Buffering monitoring and error handling

### 3. **Fallback System**
- SVG-based static fallback for unsupported devices
- Automatic activation on video failures
- Graceful degradation

## Video Compression Instructions

### Required Tools
- **FFmpeg** (free, cross-platform)
- **HandBrake** (GUI alternative)

### Compression Commands

#### 1. Convert to H.264 (Universal Compatibility)
```bash
ffmpeg -i homepage-hero.mov -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart homepage-hero-h264.mp4
```

#### 2. Convert to VP9 (Chrome/Firefox Optimized)
```bash
ffmpeg -i homepage-hero.mov -c:v libvpx-vp9 -b:v 2M -pass 1 -c:a libopus -b:a 128k -f webm -y /dev/null
ffmpeg -i homepage-hero.mov -c:v libvpx-vp9 -b:v 2M -pass 2 -c:a libopus -b:a 128k homepage-hero-vp9.webm
```

#### 3. Convert to AV1 (Most Efficient)
```bash
ffmpeg -i homepage-hero.mov -c:v libaom-av1 -b:v 2M -cpu-used 4 -c:a libopus -b:a 128k homepage-hero-av1.mp4
```

### Target Specifications
- **File Size**: 10-15MB (from 88MB)
- **Resolution**: 1080p (1920x1080)
- **Frame Rate**: 30fps
- **Bitrate**: 8-12 Mbps
- **Audio**: AAC/Opus 128kbps

### Quality Settings
- **CRF 23** (H.264): Good balance of quality/size
- **2-pass encoding**: Ensures consistent quality
- **Fast start**: Allows progressive loading

## Testing Checklist

### Performance Testing
- [ ] Load on 3G/4G/5G connections
- [ ] Test on iOS Safari, Chrome, Firefox
- [ ] Verify no buffering on slow networks
- [ ] Check hardware acceleration usage

### Compatibility Testing
- [ ] Desktop: Chrome, Firefox, Safari, Edge
- [ ] Mobile: iOS Safari, Chrome Android
- [ ] Tablets: iPad, Android tablets
- [ ] Fallback activation on video failure

### Network Testing
- [ ] Slow 3G (100-200kbps)
- [ ] Fast 3G (500-700kbps)
- [ ] 4G (2-5Mbps)
- [ ] 5G (10-50Mbps)
- [ ] WiFi (25-100Mbps)

## Video Files to Optimize

### Homepage (index.html)
- **Source**: `homepage-hero.mov` (88MB)
- **Outputs**:
  - `homepage-hero-av1.mp4` (AV1 - Primary)
  - `homepage-hero-vp9.webm` (VP9 - Chrome/Firefox)
  - `homepage-hero-h264.mp4` (H.264 - Legacy)

### PRIMUS Page (primus.html)
- **Hero Video**: `primus-hero.mp4` → `primus-hero-av1.mp4`, `primus-hero-vp9.webm`, `primus-hero-h264.mp4`
- **Vision Video**: `PRIMUSWIDEINTRO1.mp4` → `primus-wide-av1.mp4`, `primus-wide-vp9.webm`, `primus-wide-h264.mp4`

### TRION Page (trion.html)
- **Hero Video**: `trion-hero.mov` → `trion-hero-av1.mp4`, `trion-hero-vp9.webm`, `trion-hero-h264.mp4`
- **Lens Video**: `trion-hero.mov` → `trion-lens-av1.mp4`, `trion-lens-vp9.webm`, `trion-lens-h264.mp4`

### SENTINEL Page (sentinel.html)
- **Hero Video**: `sentinel-hero.mov` → `sentinel-hero-av1.mp4`, `sentinel-hero-vp9.webm`, `sentinel-hero-h264.mp4`
- **Kinetic Video**: `sentinel-hero.mov` → `sentinel-kinetic-av1.mp4`, `sentinel-kinetic-vp9.webm`, `sentinel-kinetic-h264.mp4`

### TELETRAAN Page (teletraan.html)
- **Hero Video**: `teletraan-hero.mov` → `teletraan-hero-av1.mp4`, `teletraan-hero-vp9.webm`, `teletraan-hero-h264.mp4`
- **Command Video**: `teletraan-hero.mov` → `teletraan-command-av1.mp4`, `teletraan-command-vp9.webm`, `teletraan-command-h264.mp4`

### NEST Page (nest.html)
- **Hero Video**: `nest-hero.mov` → `nest-hero-av1.mp4`, `nest-hero-vp9.webm`, `nest-hero-h264.mp4`
- **Oversight Video**: `nest-hero.mov` → `nest-oversight-av1.mp4`, `nest-oversight-vp9.webm`, `nest-oversight-h264.mp4`

### OBEX Page (obex.html)
- **Hero Video**: `obex display 1.mp4` → `obex-hero-av1.mp4`, `obex-hero-vp9.webm`, `obex-hero-h264.mp4`
- **Structural Video**: `obex display 1.mp4` → `obex-structural-av1.mp4`, `obex-structural-vp9.webm`, `obex-structural-h264.mp4`

## File Structure
```
media/
├── homepage-hero-av1.mp4    # Homepage primary
├── homepage-hero-vp9.webm   # Homepage Chrome/Firefox
├── homepage-hero-h264.mp4   # Homepage legacy
├── hero-fallback.svg        # Homepage static fallback
├── primus-hero-av1.mp4      # PRIMUS hero primary
├── primus-hero-vp9.webm     # PRIMUS hero Chrome/Firefox
├── primus-hero-h264.mp4     # PRIMUS hero legacy
├── primus-wide-av1.mp4      # PRIMUS vision primary
├── primus-wide-vp9.webm     # PRIMUS vision Chrome/Firefox
├── primus-wide-h264.mp4     # PRIMUS vision legacy
├── primus-fallback.svg      # PRIMUS hero fallback
├── primus-vision-fallback.svg # PRIMUS vision fallback
├── trion-hero-av1.mp4       # TRION hero primary
├── trion-hero-vp9.webm      # TRION hero Chrome/Firefox
├── trion-hero-h264.mp4      # TRION hero legacy
├── trion-lens-av1.mp4       # TRION lens primary
├── trion-lens-vp9.webm      # TRION lens Chrome/Firefox
├── trion-lens-h264.mp4      # TRION lens legacy
├── trion-fallback.svg       # TRION fallback
└── [Additional product fallbacks...]
```

## Batch Compression Script

Create a batch file `compress_videos.bat`:
```batch
@echo off
echo Compressing all AVZDAX videos...

REM Homepage
ffmpeg -i homepage-hero.mov -c:v libaom-av1 -b:v 2M -cpu-used 4 -c:a libopus -b:a 128k homepage-hero-av1.mp4
ffmpeg -i homepage-hero.mov -c:v libvpx-vp9 -b:v 2M -pass 1 -c:a libopus -b:a 128k -f webm -y NUL
ffmpeg -i homepage-hero.mov -c:v libvpx-vp9 -b:v 2M -pass 2 -c:a libopus -b:a 128k homepage-hero-vp9.webm
ffmpeg -i homepage-hero.mov -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart homepage-hero-h264.mp4

REM PRIMUS
ffmpeg -i primus-hero.mp4 -c:v libaom-av1 -b:v 2M -cpu-used 4 -c:a libopus -b:a 128k primus-hero-av1.mp4
ffmpeg -i primus-hero.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart primus-hero-h264.mp4
ffmpeg -i PRIMUSWIDEINTRO1.mp4 -c:v libaom-av1 -b:v 2M -cpu-used 4 -c:a libopus -b:a 128k primus-wide-av1.mp4
ffmpeg -i PRIMUSWIDEINTRO1.mp4 -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart primus-wide-h264.mp4

REM TRION
ffmpeg -i trion-hero.mov -c:v libaom-av1 -b:v 2M -cpu-used 4 -c:a libopus -b:a 128k trion-hero-av1.mp4
ffmpeg -i trion-hero.mov -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart trion-hero-h264.mp4
ffmpeg -i trion-hero.mov -c:v libaom-av1 -b:v 2M -cpu-used 4 -c:a libopus -b:a 128k trion-lens-av1.mp4
ffmpeg -i trion-hero.mov -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart trion-lens-h264.mp4

echo All videos compressed successfully!
```

## Implementation Status

- ✅ **index.html**: Fully optimized with monitoring
- ✅ **primus.html**: Fully optimized with monitoring
- 🚧 **trion.html**: Partially optimized (hero video only)
- ⏳ **sentinel.html**: Ready for optimization
- ⏳ **teletraan.html**: Ready for optimization
- ⏳ **nest.html**: Ready for optimization
- ⏳ **obex.html**: Ready for optimization

## Monitoring
The implementation includes console logging for:
- Video load events
- Buffering detection
- Fallback activation
- Network quality assessment

Check browser console for optimization status during testing.

## CDN Recommendations
For production deployment, consider:
- **Cloudflare**: Automatic video optimization
- **AWS CloudFront**: With Lambda@Edge for format selection
- **Fastly**: Real-time video transcoding

## Performance Metrics
Monitor these KPIs:
- **Time to First Frame**: <2 seconds
- **Buffering Events**: 0 on fast networks
- **Fallback Rate**: <5% of users
- **File Size**: <15MB total
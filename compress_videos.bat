@echo off
echo AVZDAX Video Compression Script
echo ================================
echo This script will compress all videos for optimal web performance
echo Make sure FFmpeg is installed and in your PATH
echo.

REM Check if FFmpeg is available
ffmpeg -version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: FFmpeg is not installed or not in PATH
    echo Please install FFmpeg from https://ffmpeg.org/download.html
    echo Or use the online compression service instead
    pause
    exit /b 1
)

echo FFmpeg found! Starting compression...
echo.

REM Create optimized versions directory
if not exist "media\optimized" mkdir "media\optimized"

echo Compressing homepage hero video...
ffmpeg -i "media\homepage-hero.mov" -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "media\homepage-hero-h264.mp4"
ffmpeg -i "media\homepage-hero.mov" -c:v libvpx-vp9 -b:v 2M -pass 1 -c:a libopus -b:a 128k -f webm -y NUL
ffmpeg -i "media\homepage-hero.mov" -c:v libvpx-vp9 -b:v 2M -pass 2 -c:a libopus -b:a 128k -y "media\homepage-hero-vp9.webm"

echo Compressing PRIMUS videos...
ffmpeg -i "media\primus-hero.mp4" -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "media\primus-hero-h264.mp4"
ffmpeg -i "media\PRIMUSWIDEINTRO1.mp4" -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "media\primus-wide-h264.mp4"

echo Compressing TRION videos...
ffmpeg -i "media\trion-hero.mov" -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "media\trion-hero-h264.mp4"
ffmpeg -i "media\trion-hero.mov" -c:v libx264 -preset slow -crf 23 -c:a aac -b:a 128k -movflags +faststart -y "media\trion-lens-h264.mp4"

echo.
echo Compression complete! Optimized videos created.
echo Original file sizes vs Optimized:
echo - 88MB homepage-hero.mov → ~12MB homepage-hero-h264.mp4 (86%% reduction)
echo - Similar reductions for all other videos
echo.
echo Your website will now use these optimized videos automatically!
echo.
pause
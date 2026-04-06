echo FFmpeg found! Starting optimization...
set FFMPEG_PATH="C:\Users\hercu\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-8.0.1-full_build\bin\ffmpeg.exe"
echo.

cd /d "%~dp0media"

:: Create poster image from hero video
echo [1/4] Creating hero poster image...
if exist "homepage-hero.mp4" (
    %FFMPEG_PATH% -y -i "homepage-hero.mp4" -vframes 1 -q:v 2 "hero-poster.jpg" 2>nul
    echo       Created hero-poster.jpg
) else (
    echo       SKIP: homepage-hero.mp4 not found
)

:: Compress homepage hero video
echo [2/4] Compressing homepage hero video...
if exist "homepage-hero.mp4" (
    %FFMPEG_PATH% -y -i "homepage-hero.mp4" -c:v libx264 -crf 26 -preset slow -movflags +faststart -an "homepage-hero-optimized.mp4" 2>nul
    echo       Created homepage-hero-optimized.mp4
)

:: Compress footer video
echo [3/4] Compressing footer video...
if exist "XBAThero-web.mp4" (
    %FFMPEG_PATH% -y -i "XBAThero-web.mp4" -c:v libx264 -crf 32 -preset slow -movflags +faststart -an -vf "scale=1280:-1" "XBAThero-web-optimized.mp4" 2>nul
    echo       Created XBAThero-web-optimized.mp4
)

:: Create WebM version of hero (best for web)
echo [4/4] Creating WebM version (best for web)...
if exist "homepage-hero.mp4" (
    %FFMPEG_PATH% -y -i "homepage-hero.mp4" -c:v libvpx-vp9 -crf 35 -b:v 0 -an "homepage-hero.webm" 2>nul
    echo       Created homepage-hero.webm
)

echo.
echo ============================================
echo OPTIMIZATION COMPLETE!
echo ============================================
echo.
echo NEXT STEPS:
echo 1. Replace video sources in your HTML:
echo    - homepage-hero.mp4 -> homepage-hero-optimized.mp4
echo    - XBAThero-web.mp4 -> XBAThero-web-optimized.mp4
echo.
echo 2. Or use the WebM version for even better performance:
echo    Add this to your video tag:
echo    ^<source src="/media/homepage-hero.webm" type="video/webm"^>
echo    ^<source src="/media/homepage-hero-optimized.mp4" type="video/mp4"^>
echo.
echo 3. The hero-poster.jpg is already configured in your HTML!
echo.

cd /d "%~dp0"
pause

$videos = @(
    "media/FULL_HERO.mp4",
    "media/obex-heroFULL.mp4",
    "media/teletraan-hero.mov",
    "media/primus-hero.mp4",
    "media/homepage-hero.mp4"
)

foreach ($video in $videos) {
    if (Test-Path $video) {
        $parent = Split-Path $video -Parent
        if ([string]::IsNullOrEmpty($parent)) { $parent = "." }
        $leaf = Split-Path $video -Leaf
        $originalName = "$leaf" + "_original"
        # Join-Path handles path separators correctly
        $originalPath = Join-Path -Path $parent -ChildPath $originalName
        
        Write-Host "Processing $video..."
        
        # Check if we already have an _original (interrupted run?), if so, use it, otherwise rename
        if (-not (Test-Path $originalPath)) {
            try {
                Rename-Item -Path $video -NewName $originalName -ErrorAction Stop
            } catch {
                Write-Host "Error renaming $video to $originalName : $_"
                continue
            }
        }
        
        if (Test-Path $originalPath) {
            Write-Host "Optimizing from $originalPath to $video..."
            
            # Using -vcodec libx264 -crf 28 (good compression) -preset fast -an (no audio) -movflags +faststart (web optimized)
            # -y overwrites output (which shouldn't exist if we renamed, but just in case)
            $params = @("-y", "-i", $originalPath, "-vcodec", "libx264", "-crf", "28", "-preset", "fast", "-an", "-movflags", "+faststart", $video)
            
            $process = Start-Process -FilePath "ffmpeg" -ArgumentList $params -Wait -NoNewWindow -PassThru
            
            if ($process.ExitCode -eq 0 -and (Test-Path $video)) {
                $oldSize = (Get-Item $originalPath).Length
                $newSize = (Get-Item $video).Length
                
                Write-Host "Original: $($oldSize/1MB) MB, New: $($newSize/1MB) MB"

                if ($newSize -lt $oldSize -and $newSize -gt 1000) {
                    Write-Host "Optimization successful."
                    Remove-Item $originalPath
                } else {
                    Write-Host "Optimization didn't save space or failed. Reverting."
                    Remove-Item $video -ErrorAction SilentlyContinue
                    Rename-Item -Path $originalPath -NewName $leaf
                }
            } else {
                Write-Host "FFmpeg returned error code $($process.ExitCode). Reverting."
                if (Test-Path $video) { Remove-Item $video }
                Rename-Item -Path $originalPath -NewName $leaf
            }
        }
    } else {
        Write-Host "File not found: $video"
    }
}

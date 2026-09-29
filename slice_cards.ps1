param (
    [string]$ImagePath = "C:\Users\User\.gemini\antigravity-ide\brain\017deeb1-ab81-4ca9-b766-d94cf2b1cef0\media__1785601174790.png",
    [string]$OutputDir = "c:\Users\User\Documents\antigravity\Proyecto Truco\assets\cards"
)

Add-Type -AssemblyName System.Drawing

if (!(Test-Path -Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

$img = [System.Drawing.Image]::FromFile($ImagePath)
$cardW = 85
$cardH = 130
$startX = 2
$startY = 2

# Upscale dimensions for high-DPI screens (Retina)
$scale = 3
$destW = $cardW * $scale
$destH = $cardH * $scale

$suits = @('coins', 'cups', 'swords', 'clubs')

for ($row = 0; $row -lt 4; $row++) {
    $suit = $suits[$row]
    for ($col = 0; $col -lt 12; $col++) {
        $num = $col + 1
        $numStr = $num.ToString("00")
        
        $x = $startX + ($col * $cardW)
        $y = $startY + ($row * $cardH)
        
        $srcRect = New-Object System.Drawing.Rectangle($x, $y, $cardW, $cardH)
        $destRect = New-Object System.Drawing.Rectangle(0, 0, $destW, $destH)
        
        $bmp = New-Object System.Drawing.Bitmap($destW, $destH)
        $bmp.SetResolution($img.HorizontalResolution * $scale, $img.VerticalResolution * $scale)
        $gfx = [System.Drawing.Graphics]::FromImage($bmp)
        
        # High quality upscaling
        $gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        
        # Draw image upscaled
        $gfx.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
        
        $outPath = Join-Path $OutputDir "card_$suit`_$numStr.png"
        $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
        
        $gfx.Dispose()
        $bmp.Dispose()
    }
}

# Extract card back
$x = $startX + (1 * $cardW)
$y = $startY + (4 * $cardH)
$srcRect = New-Object System.Drawing.Rectangle($x, $y, $cardW, $cardH)
$destRect = New-Object System.Drawing.Rectangle(0, 0, $destW, $destH)
$bmp = New-Object System.Drawing.Bitmap($destW, $destH)
$gfx = [System.Drawing.Graphics]::FromImage($bmp)
$gfx.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
$gfx.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$gfx.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
$gfx.DrawImage($img, $destRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$outPath = Join-Path $OutputDir "card_back.png"
$bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
$gfx.Dispose()
$bmp.Dispose()

$img.Dispose()
Write-Host "All cards extracted and upscaled successfully."

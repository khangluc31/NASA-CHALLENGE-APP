param([string]$SourceDirectory = (Join-Path ([System.IO.Path]::GetTempPath()) 'earth-jukebox-night-lights'))
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$outputDirectory = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/media/night-lights'))
New-Item -ItemType Directory -Path $SourceDirectory, $outputDirectory -Force | Out-Null
$baseUrl = 'https://svs.gsfc.nasa.gov/vis/a000000/a005200/a005276/frames/7680x4320_16x9_3p/nightlights_flat_2012-2023_only_lights'
2012..2023 | ForEach-Object -Parallel {
  $target = Join-Path $using:SourceDirectory "night-lights-$_.tif"
  if (-not (Test-Path -LiteralPath $target)) {
    Invoke-WebRequest -Uri "$using:baseUrl/nightlights_flat_series_stills_8k_only_lights.$_.tif" -OutFile $target -TimeoutSec 180
  }
} -ThrottleLimit 4
$provenance = @()
foreach ($year in 2012..2023) {
  $sourcePath = Join-Path $SourceDirectory "night-lights-$year.tif"
  $source = [System.Drawing.Bitmap]::FromFile($sourcePath)
  try {
    if ($source.Width -ne 7680 -or $source.Height -ne 4320) { throw 'Unexpected NASA frame dimensions.' }
    $graphics = [System.Drawing.Graphics]::FromImage($source)
    try {
      # Remove the baked-in year label in the South Atlantic, not geographic lights.
      $graphics.FillRectangle([System.Drawing.Brushes]::Black, 3300, 2600, 450, 240)
    } finally { $graphics.Dispose() }
    $output = [System.Drawing.Bitmap]::new(2048, 1024)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($output)
      try {
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, 2048, 1024))
      } finally { $graphics.Dispose() }
      $encoder = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
      $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
      try {
        $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]92)
        $output.Save((Join-Path $outputDirectory "$year.jpg"), $encoder, $parameters)
      } finally { $parameters.Dispose() }
    } finally { $output.Dispose() }
  } finally { $source.Dispose() }
  $provenance += @{ year = $year; sourceUrl = "$baseUrl/nightlights_flat_series_stills_8k_only_lights.$year.tif"; sourceSha256 = (Get-FileHash -LiteralPath $sourcePath -Algorithm SHA256).Hash.ToLowerInvariant() }
}
ConvertTo-Json -InputObject $provenance -Depth 4 | Set-Content -LiteralPath (Join-Path $outputDirectory 'provenance.json') -Encoding utf8
Write-Output 'Prepared 12 NASA annual lights-only overlays.'

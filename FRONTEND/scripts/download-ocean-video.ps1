$ErrorActionPreference = 'Stop'
$destination = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/media/ocean/ecco2-surface-flow-2048.mp4'))
$expectedHash = 'EEDE4B8230E37E2241AE8459A83C5CE21F824E1DACC3EA692D7DBCEC35C42851'
if (Test-Path -LiteralPath $destination) {
  if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Existing ocean video has an unexpected checksum; it has not been overwritten.'
  }
  Write-Output 'High-resolution ocean video is already present and verified.'
  return
}
New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
$downloadPath = "$destination.download"
Invoke-WebRequest -Uri 'https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/ecco2_sst_flow.mp4' -OutFile $downloadPath -TimeoutSec 600
if ((Get-FileHash -LiteralPath $downloadPath -Algorithm SHA256).Hash -ne $expectedHash) {
  throw 'Downloaded ocean video has an unexpected checksum. The application asset has not been replaced.'
}
Move-Item -LiteralPath $downloadPath -Destination $destination
Write-Output 'Downloaded and verified the unmodified high-resolution NASA ocean video.'

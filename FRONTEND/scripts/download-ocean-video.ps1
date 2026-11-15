$ErrorActionPreference = 'Stop'
$destination = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../public/media/ocean/ecco2_sst_flow.m4v'))
$expectedHash = '72168FC1EF93E5ED622D29AF79E027BAF7C5372D175D8774D3F33C98A8EAEA5F'
if (Test-Path -LiteralPath $destination) {
  if ((Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash -ne $expectedHash) {
    throw 'Existing ocean video has an unexpected checksum; it has not been overwritten.'
  }
  Write-Output 'GitHub-sized ocean video is already present and verified.'
  return
}
New-Item -ItemType Directory -Path ([System.IO.Path]::GetDirectoryName($destination)) -Force | Out-Null
$downloadPath = "$destination.download"
Invoke-WebRequest -Uri 'https://svs.gsfc.nasa.gov/vis/a000000/a003900/a003912/ecco2_sst_flow.m4v' -OutFile $downloadPath -TimeoutSec 600
if ((Get-FileHash -LiteralPath $downloadPath -Algorithm SHA256).Hash -ne $expectedHash) {
  throw 'Downloaded ocean video has an unexpected checksum. The application asset has not been replaced.'
}
Move-Item -LiteralPath $downloadPath -Destination $destination
Write-Output 'Downloaded and verified the unmodified NASA ocean video (640 x 320).'

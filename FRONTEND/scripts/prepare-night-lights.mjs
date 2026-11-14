import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { prepareNightLights } from '../src/data/adapters/nightLights.ts'

if (!process.argv[2]) throw new Error('Usage: node --experimental-strip-types scripts/prepare-night-lights.mjs <original-json>')
const bytes = await readFile(process.argv[2])
const raw = JSON.parse(bytes.toString('utf8'))
const asset = prepareNightLights(raw)
const directory = new URL('../public/data/night-lights/', import.meta.url)
await mkdir(directory, { recursive: true })
await writeFile(new URL('map.json', directory), JSON.stringify(asset))
await writeFile(new URL('provenance.json', directory), JSON.stringify({
  sourceUrl: 'https://svs.gsfc.nasa.gov/5313/',
  originalSha256: createHash('sha256').update(bytes).digest('hex'),
  source: raw.source, calibration: raw.calibration, mask: raw.mask,
  processing: 'Lossless column-major to row-major conversion of data grid; no rounding. Audio grids and global statistics omitted. Video-derived normalized brightness, not radiance.',
}, null, 2) + '\n')
console.log(`Prepared ${asset.frames.length} annual map frames.`)

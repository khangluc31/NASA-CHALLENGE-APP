import type { MapLayerContext } from '../types'

export function NightLightsLayer({ year, images, width, height }: MapLayerContext & { year: number; images: string[] }) {
  const lower = Math.floor(year) - 2012
  const upper = Math.min(11, lower + 1)
  const blend = year - Math.floor(year)
  return <g pointerEvents="none" aria-label={`Annual night lights, ${Math.round(year)}`}>
    <rect width={width} height={height} fill="black" opacity={0.86} />
    <g style={{ mixBlendMode: 'screen' }}>
      <image href={images[lower]} width={width} height={height} />
      {upper !== lower && blend > 0 && <image href={images[upper]} width={width} height={height} opacity={blend} />}
    </g>
  </g>
}

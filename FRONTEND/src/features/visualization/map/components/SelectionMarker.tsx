import type { MapLocation } from '../types'
import { locationToMapPoint } from '../utils/coordinates'

export function SelectionMarker({ location, zoom }: { location: MapLocation; zoom: number }) {
  const { x, y } = locationToMapPoint(location)
  return <g transform={`translate(${x} ${y}) scale(${1 / zoom})`} pointerEvents="none" aria-hidden="true">
    <circle r="6" fill="#ffd078" />
  </g>
}

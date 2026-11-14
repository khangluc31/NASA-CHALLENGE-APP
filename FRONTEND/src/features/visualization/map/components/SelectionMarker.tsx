import type { MapLocation } from '../types'
import { locationToMapPoint } from '../utils/coordinates'

export function SelectionMarker({ location, zoom }: { location: MapLocation; zoom: number }) {
  const { x, y } = locationToMapPoint(location)
  return <g transform={`translate(${x} ${y}) scale(${1 / zoom})`} pointerEvents="none" aria-hidden="true">
    <circle r="7" fill="white" stroke="black" strokeWidth="2" />
    <path d="M -11 0 H 11 M 0 -11 V 11" fill="none" stroke="black" strokeWidth="2" />
  </g>
}

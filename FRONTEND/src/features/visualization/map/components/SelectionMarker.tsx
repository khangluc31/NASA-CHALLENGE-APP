import type { MapLocation } from '../types'
import { locationToMapPoint } from '../utils/coordinates'

export function SelectionMarker({ location, zoom }: { location: MapLocation; zoom: number }) {
  const { x, y } = locationToMapPoint(location)
  return <g transform={`translate(${x} ${y}) scale(${1 / zoom})`} pointerEvents="none" aria-hidden="true">
    <path d="M 0 0 C -4 -6 -11 -15 -11 -22 A 11 11 0 0 1 11 -22 C 11 -15 4 -6 0 0 Z"
      fill="#ea4335" stroke="#fff" strokeWidth="1" />
    <circle cy="-22" r="4" fill="#fff" />
  </g>
}

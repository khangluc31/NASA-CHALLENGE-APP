import type { GlobeLocation } from './globe'

export function CoordinateReadout({ location }: { location: GlobeLocation | null }) {
  return <output className="viewer-coordinate" aria-live="polite" aria-label="Selected coordinates">
    {location ? `${location.latitude.toFixed(3)}° lat / ${location.longitude.toFixed(3)}° lon` : 'No location selected'}
  </output>
}

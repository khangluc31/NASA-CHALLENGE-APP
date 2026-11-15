import type { ReactNode } from 'react'
import type { GlobeLocation } from './globe'
import { CoordinateReadout } from './CoordinateReadout'

interface ViewerToolsProps {
  locked: boolean
  location: GlobeLocation | null
  onZoom: (direction: 'in' | 'out') => void
  actions?: ReactNode
  secondary?: ReactNode
}

/** One compact action row, with an optional legend or timeline below it. */
export function ViewerTools({ locked, location, onZoom, actions, secondary }: ViewerToolsProps) {
  return <footer className="viewer-footer"><div className="viewer-tools">
    <div className="viewer-tools__actions">
      <button type="button" disabled={locked} aria-label="Zoom out" title="Zoom out" onClick={() => onZoom('out')}>−</button>
      <button type="button" disabled={locked} aria-label="Zoom in" title="Zoom in" onClick={() => onZoom('in')}>+</button>
    </div>
    <div className="viewer-tools__chapter-actions">{actions}</div>
    <CoordinateReadout location={location} />
  </div>{secondary}</footer>
}

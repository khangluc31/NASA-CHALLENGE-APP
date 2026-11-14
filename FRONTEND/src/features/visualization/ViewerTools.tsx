import type { ReactNode } from 'react'
import type { GlobeLocation } from './globe'
import { CoordinateReadout } from './CoordinateReadout'

interface ViewerToolsProps {
  locked: boolean
  location: GlobeLocation | null
  onZoom: (direction: 'in' | 'out') => void
  hint: string
  children?: ReactNode
}

/** Small controls in the scene footer; coordinate entry is optional. */
export function ViewerTools({ locked, location, onZoom, hint, children }: ViewerToolsProps) {
  return <div className="viewer-tools">
    <div className="viewer-tools__actions">
      <button type="button" disabled={locked} aria-label="Zoom out" title="Zoom out" onClick={() => onZoom('out')}>−</button>
      <button type="button" disabled={locked} aria-label="Zoom in" title="Zoom in" onClick={() => onZoom('in')}>+</button>
      <span className="viewer-tools__hint">{hint}</span>
      {children && <details className="viewer-tools__coordinates">
        <summary aria-disabled={locked}>Select coordinates</summary>
        <div className="viewer-tools__entry">{children}</div>
      </details>}
    </div>
    <CoordinateReadout location={location} />
  </div>
}

import type { MapNavigationAction, MapView } from '../types'
import { MAX_ZOOM } from '../utils/coordinates'

const ACTIONS: { action: MapNavigationAction; label: string }[] = [
  { action: 'left', label: 'Pan west' }, { action: 'right', label: 'Pan east' },
  { action: 'up', label: 'Pan north' }, { action: 'down', label: 'Pan south' },
  { action: 'in', label: 'Zoom in' }, { action: 'out', label: 'Zoom out' },
  { action: 'reset', label: 'Reset view' },
]

export function MapNavigationControls({ locked, view, onAction }: {
  locked: boolean; view: MapView; onAction: (action: MapNavigationAction) => void
}) {
  return <fieldset disabled={locked}>
    <legend>Map navigation</legend>
    <div className="map-viewer__controls">{ACTIONS.map(({ action, label }) =>
      <button key={action} type="button" onClick={() => onAction(action)}
        disabled={(action === 'in' && view.zoom >= MAX_ZOOM) || (action === 'out' && view.zoom <= 1)}>{label}</button>)}
    </div>
    <p>Zoom: {view.zoom.toFixed(1)}×. Zoom in to browse smaller regions.</p>
  </fieldset>
}

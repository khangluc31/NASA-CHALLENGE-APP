import { useId, useState } from 'react'
import type { FormEvent } from 'react'
import type { MapViewerProps } from './types'
import { BLUE_MARBLE_TEXTURE } from '../globe/surfaceTexture'
import { isMapLocation, locationToMapPoint, mapPointToLocation, MAP_HEIGHT, MAP_WIDTH } from './utils/coordinates'
import { useMapNavigation } from './hooks/useMapNavigation'
import { useMapSurfaceImage } from './hooks/useMapSurfaceImage'
import { MapSurface } from './components/MapSurface'
import { MapNavigationControls } from './components/MapNavigationControls'
import { SelectionMarker } from './components/SelectionMarker'
import { MapErrorBoundary } from './components/MapErrorBoundary'
import { ViewerTools } from '../ViewerTools'
import './map.css'

export function MapViewer({ className = '', label = 'Interactive map', ...props }: MapViewerProps) {
  const [attempt, setAttempt] = useState(0)
  return <section className={`map-viewer ${className}`} aria-label={label}>
    <MapErrorBoundary key={attempt} onRetry={() => setAttempt((value) => value + 1)}>
      <MapContent {...props} />
    </MapErrorBoundary>
  </section>
}

function MapContent({ embedded = false, interactionLocked = false, selectedLocation = null, onLocationSelect,
  surfaceImage = BLUE_MARBLE_TEXTURE, contentState = { status: 'ready' }, layers, layerDescription }: MapViewerProps) {
  const [imageAttempt, setImageAttempt] = useState(0)
  const image = useMapSurfaceImage(surfaceImage?.path, imageAttempt)
  const locked = interactionLocked || contentState.status === 'loading' || image.status !== 'ready'
  const canSelect = !locked && contentState.status === 'ready' && Boolean(onLocationSelect)
  const selection = selectedLocation && isMapLocation(selectedLocation) ? selectedLocation : null
  const navigation = useMapNavigation(locked)
  const instructionsId = useId()
  const latitudeId = useId()
  const longitudeId = useId()

  function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSelect) return
    const form = new FormData(event.currentTarget)
    const latitude = form.get('latitude')
    const longitude = form.get('longitude')
    if (typeof latitude !== 'string' || typeof longitude !== 'string' || !latitude.trim() || !longitude.trim()) return
    const location = { latitude: Number(latitude), longitude: Number(longitude) }
    if (isMapLocation(location)) onLocationSelect?.(location)
  }

  const coordinateForm = onLocationSelect && <form onSubmit={submitLocation}>
    <fieldset disabled={!canSelect}>
      <legend>Select geographic coordinates</legend>
      <div className="map-viewer__controls">
        <label htmlFor={latitudeId}>Latitude (−90 to 90°)</label>
        <input id={latitudeId} name="latitude" type="number" min={-90} max={90} step="any" required />
        <label htmlFor={longitudeId}>Longitude (−180 to 180°)</label>
        <input id={longitudeId} name="longitude" type="number" min={-180} max={180} step="any" required />
        <button type="submit">{embedded ? 'Select' : 'Select location'}</button>
        <button type="button" disabled={!selection} onClick={() => onLocationSelect(null)}>{embedded ? 'Clear' : 'Clear selection'}</button>
      </div>
    </fieldset>
  </form>

  return <>
    <p className={embedded ? 'viewer-instructions-sr' : undefined} id={instructionsId}>Drag to pan; pinch to zoom. Focus the map to zoom with the scroll wheel.
      Use arrow keys to pan, +/− to zoom, and Home to reset, or use the buttons below.
      {onLocationSelect && ' Click the map or enter coordinates to select a location.'}</p>
    <div className="map-viewer__viewport">
    <MapSurface imageUrl={image.status === 'ready' ? image.url : undefined}
      view={navigation.view} locked={locked} instructionsId={instructionsId}
      onSelect={canSelect ? onLocationSelect : undefined}
      onPan={navigation.panBy} onZoom={navigation.zoomAt} onAction={navigation.act}>
      {contentState.status === 'ready' && image.status === 'ready' && layers?.({
        width: MAP_WIDTH, height: MAP_HEIGHT, project: locationToMapPoint, unproject: mapPointToLocation,
        selectedLocation: selection, interactionLocked: locked,
      })}
      {selection && <SelectionMarker location={selection} zoom={navigation.view.zoom} />}
    </MapSurface>
    </div>
    <div role="status" aria-live="polite">
      {image.status === 'loading' && <p>Loading reference map…</p>}
      {image.status === 'error' && <p>The reference image could not be loaded or is not a 2:1 world image.
        {' '}<button type="button" disabled={interactionLocked} onClick={() => setImageAttempt((value) => value + 1)}>Retry image</button></p>}
      {contentState.status !== 'ready' && <p>{contentState.message}</p>}
      {interactionLocked && <p>Map interaction is paused during the page transition.</p>}
      <p className={embedded ? 'viewer-instructions-sr' : undefined}>{selection ? `Selected: ${selection.latitude.toFixed(3)}° latitude, ${selection.longitude.toFixed(3)}° longitude.` : 'No location selected.'}</p>
    </div>
    {embedded && <ViewerTools locked={locked} location={selection} onZoom={navigation.act}
      hint="Drag to pan · Click to select">{coordinateForm}</ViewerTools>}
    {embedded && layerDescription && <p className="viewer-instructions-sr">{layerDescription}</p>}
    {!embedded && <details className="viewer-options" open>
      <summary>Controls &amp; image credits</summary>
      <MapNavigationControls locked={locked} view={navigation.view} onAction={navigation.act} />
      {coordinateForm}
      {!surfaceImage && <p>Reference coordinate grid; no scientific data is represented by its surface.</p>}
      {surfaceImage && <p>{surfaceImage.attribution}{surfaceImage.sourceUrl && <>
        {' '}<a href={surfaceImage.sourceUrl}>Image source</a>
      </>}</p>}
      <p>Equirectangular projection; polar regions are distorted. The reference surface supplies geographic context, not chapter measurements.</p>
      {layerDescription && <p>{layerDescription}</p>}
      {onLocationSelect && <p>A selected coordinate must be resolved by the chapter’s data adapter before displaying measurements or playing audio.</p>}
    </details>}
  </>
}

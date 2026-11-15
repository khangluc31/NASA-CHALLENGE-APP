import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import type { GlobeViewerProps } from './types'
import { useSurfaceTexture } from './hooks/useSurfaceTexture'
import { isGlobeLocation } from './utils/coordinates'
import { EarthSurface } from './components/EarthSurface'
import { SelectionMarker } from './components/SelectionMarker'
import { GlobeCameraControls } from './components/GlobeCameraControls'
import type { CameraAction, GlobeCameraHandle } from './components/GlobeCameraControls'
import { GlobeErrorBoundary } from './components/GlobeErrorBoundary'
import { BLUE_MARBLE_TEXTURE } from './surfaceTexture'
import { ViewerTools } from '../ViewerTools'
import { GlobeKeyboardSelection } from './components/GlobeKeyboardSelection'
import type { GlobeKeyboardSelectionHandle } from './components/GlobeKeyboardSelection'
import './globe.css'

const CAMERA_ACTIONS: { action: CameraAction; label: string }[] = [
  { action: 'left', label: 'Rotate left' }, { action: 'right', label: 'Rotate right' },
  { action: 'up', label: 'Rotate up' }, { action: 'down', label: 'Rotate down' },
  { action: 'in', label: 'Zoom in' }, { action: 'out', label: 'Zoom out' },
  { action: 'reset', label: 'Reset view' },
]

export function GlobeViewer({ className = '', label = 'Interactive globe', ...props }: GlobeViewerProps) {
  const [attempt, setAttempt] = useState(0)
  return <section className={`globe-viewer ${className}`} aria-label={label}>
    <GlobeErrorBoundary key={attempt} message={props.loadErrorMessage} locked={props.interactionLocked} onRetry={() => setAttempt((value) => value + 1)}>
      <GlobeContent {...props} />
    </GlobeErrorBoundary>
  </section>
}

function GlobeContent({ embedded = false, interactionLocked = false, selectedLocation = null, onLocationSelect,
  surfaceTexture = BLUE_MARBLE_TEXTURE, layers, contentState = { status: 'ready' }, layerDescription, footerActions, footerSecondary,
  loadErrorMessage = 'Globe could not be loaded.' }: GlobeViewerProps) {
  const [textureAttempt, setTextureAttempt] = useState(0)
  const texture = useSurfaceTexture(surfaceTexture?.path, textureAttempt)
  const camera = useRef<GlobeCameraHandle>(null)
  const keyboardSelection = useRef<GlobeKeyboardSelectionHandle>(null)
  const instructionsId = useId()
  const latitudeId = useId()
  const longitudeId = useId()
  const [contextLost, setContextLost] = useState(false)
  const [canvasReady, setCanvasReady] = useState(false)
  const selection = selectedLocation && isGlobeLocation(selectedLocation) ? selectedLocation : null
  const locked = interactionLocked || contentState.status === 'loading' || texture.status !== 'ready'
  const canSelect = !locked && contentState.status === 'ready' && Boolean(onLocationSelect)

  if (contextLost) throw new Error('WebGL context lost')

  function submitLocation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!canSelect) return
    const data = new FormData(event.currentTarget)
    const location = { latitude: Number(data.get('latitude')), longitude: Number(data.get('longitude')) }
    if (isGlobeLocation(location)) onLocationSelect?.(location)
  }

  const coordinateForm = !embedded && onLocationSelect && <form onSubmit={submitLocation}>
    <fieldset disabled={!canSelect}>
      <legend>Select geographic coordinates</legend>
      <div className="globe-viewer__controls">
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
    <p className={embedded ? 'viewer-instructions-sr' : undefined} id={instructionsId}>Drag to rotate; scroll or pinch to zoom. Focus the globe and use arrow keys to rotate, +/− to zoom, or Home to reset.
      {onLocationSelect && (embedded ? ' Click or tap to select. With keyboard focus, Enter selects the center crosshair; arrows rotate the view.' : ' Click the surface or enter coordinates to select a location.')}</p>
    <div className="globe-viewer__scene" aria-describedby={instructionsId} aria-label="Interactive globe" role="group"
      data-selectable={Boolean(onLocationSelect)}
      tabIndex={embedded ? 0 : undefined} aria-disabled={locked} onKeyDown={event => {
        if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
        if (event.key === 'Enter' && onLocationSelect) { event.preventDefault(); if (canSelect) keyboardSelection.current?.select(); return }
        const actions: Record<string, CameraAction> = {
          ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
          '+': 'in', '=': 'in', '-': 'out', Home: 'reset',
        }
        const action = actions[event.key]
        if (action) { event.preventDefault(); if (!locked) camera.current?.act(action) }
      }}>
      <Canvas camera={{ position: [0, 0, embedded ? 3.1 : 3.4], fov: 45, near: 0.01, far: 30 }}
        dpr={[1, 1.5]} frameloop="demand" gl={{ preserveDrawingBuffer: embedded }}
        onCreated={() => setCanvasReady(true)}
        fallback={<p role="alert">This browser does not support WebGL. Try the map view where available.</p>}>
        <ContextMonitor onLost={() => setContextLost(true)} />
        <ambientLight intensity={1} />
        <directionalLight position={[3, 3, 3]} intensity={2} />
        <EarthSurface texture={texture.texture} onSelect={canSelect ? onLocationSelect : undefined} />
        {selection && <SelectionMarker location={selection} />}
        {contentState.status === 'ready' && texture.status === 'ready' && layers?.({
          radius: 1, interactionLocked: locked, selectedLocation: selection,
        })}
        <GlobeCameraControls ref={camera} locked={locked} />
        {onLocationSelect && <GlobeKeyboardSelection ref={keyboardSelection} onSelect={canSelect ? onLocationSelect : undefined} />}
      </Canvas>
    </div>
    <div role="status" aria-live="polite">
      {texture.status === 'loading' && <p>Loading globe texture…</p>}
      {texture.status === 'error' && <p>{loadErrorMessage} <button type="button" className="viewer-retry" disabled={interactionLocked} onClick={() => {
        setTextureAttempt((value) => value + 1)
      }}>Retry Image</button></p>}
      {texture.status !== 'error' && contentState.status !== 'ready' && <p>{contentState.message}</p>}
      {interactionLocked && <p>Globe interaction is paused during the page transition.</p>}
      {(onLocationSelect || selection) && <p className={embedded ? 'viewer-instructions-sr' : undefined}>{selection ? `Selected: ${selection.latitude.toFixed(3)}° latitude, ${selection.longitude.toFixed(3)}° longitude.` : 'No location selected.'}</p>}
    </div>
    {embedded && <ViewerTools locked={locked || !canvasReady} location={selection} onZoom={direction => camera.current?.act(direction)}
      showCoordinates={Boolean(onLocationSelect || selection)}
      actions={footerActions} secondary={footerSecondary} />}
    {embedded && layerDescription && <p className="viewer-instructions-sr">{layerDescription}</p>}
    {!embedded && <details className="viewer-options" open>
      <summary>Controls &amp; image credits</summary>
      <fieldset disabled={locked || !canvasReady}>
        <legend>Globe navigation</legend>
        <div className="globe-viewer__controls">{CAMERA_ACTIONS.map(({ action, label }) =>
          <button key={action} type="button" onClick={() => camera.current?.act(action)}>{label}</button>)}
        </div>
      </fieldset>
      {coordinateForm}
      {!surfaceTexture && <p>Untextured reference globe; no scientific data is represented by its surface.</p>}
      {surfaceTexture && <p>{surfaceTexture.attribution}{surfaceTexture.sourceUrl && <>
        {' '}<a href={surfaceTexture.sourceUrl}>Image source</a>
      </>}</p>}
      {layerDescription && <p>{layerDescription}</p>}
      {onLocationSelect && <p>A selected coordinate must be resolved by the chapter’s data adapter before displaying measurements or playing audio.</p>}
    </details>}
  </>
}

function ContextMonitor({ onLost }: { onLost: () => void }) {
  const canvas = useThree((state) => state.gl.domElement)
  useEffect(() => {
    const handleLost = (event: Event) => { event.preventDefault(); onLost() }
    canvas.addEventListener('webglcontextlost', handleLost)
    return () => canvas.removeEventListener('webglcontextlost', handleLost)
  }, [canvas, onLost])
  return null
}

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
    <GlobeErrorBoundary key={attempt} onRetry={() => setAttempt((value) => value + 1)}>
      <GlobeContent {...props} />
    </GlobeErrorBoundary>
  </section>
}

function GlobeContent({ interactionLocked = false, selectedLocation = null, onLocationSelect,
  surfaceTexture = BLUE_MARBLE_TEXTURE, layers, contentState = { status: 'ready' }, layerDescription }: GlobeViewerProps) {
  const [textureAttempt, setTextureAttempt] = useState(0)
  const texture = useSurfaceTexture(surfaceTexture?.path, textureAttempt)
  const camera = useRef<GlobeCameraHandle>(null)
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

  return <>
    <p id={instructionsId}>Drag to rotate; scroll or pinch to zoom. Use the buttons for keyboard navigation.
      {onLocationSelect && ' Click the surface or enter coordinates to select a location.'}</p>
    <div className="globe-viewer__scene" aria-describedby={instructionsId} aria-label="Globe rendering">
      <Canvas camera={{ position: [0, 0, 3.4], fov: 45, near: 0.01, far: 30 }}
        dpr={[1, 1.5]} frameloop="demand"
        onCreated={() => setCanvasReady(true)}
        fallback={<p role="alert">This browser does not support WebGL. Coordinate selection is available below.</p>}>
        <ContextMonitor onLost={() => setContextLost(true)} />
        <ambientLight intensity={1} />
        <directionalLight position={[3, 3, 3]} intensity={2} />
        <EarthSurface texture={texture.texture} onSelect={canSelect ? onLocationSelect : undefined} />
        {selection && <SelectionMarker location={selection} />}
        {contentState.status === 'ready' && texture.status === 'ready' && layers?.({
          radius: 1, interactionLocked: locked, selectedLocation: selection,
        })}
        <GlobeCameraControls ref={camera} locked={locked} />
      </Canvas>
    </div>
    <div role="status" aria-live="polite">
      {texture.status === 'loading' && <p>Loading globe texture…</p>}
      {texture.status === 'error' && <p>{texture.message} <button type="button" onClick={() => {
        setTextureAttempt((value) => value + 1)
      }}>Retry texture</button></p>}
      {contentState.status !== 'ready' && <p>{contentState.message}</p>}
      {interactionLocked && <p>Globe interaction is paused during the page transition.</p>}
      <p>{selection ? `Selected: ${selection.latitude.toFixed(3)}° latitude, ${selection.longitude.toFixed(3)}° longitude.` : 'No location selected.'}</p>
    </div>
    <fieldset disabled={locked || !canvasReady}>
      <legend>Globe navigation</legend>
      <div className="globe-viewer__controls">{CAMERA_ACTIONS.map(({ action, label }) =>
        <button key={action} type="button" onClick={() => camera.current?.act(action)}>{label}</button>)}
      </div>
    </fieldset>
    {onLocationSelect && <form onSubmit={submitLocation}>
      <fieldset disabled={!canSelect}>
        <legend>Select geographic coordinates</legend>
        <div className="globe-viewer__controls">
          <label htmlFor={latitudeId}>Latitude (−90 to 90°)</label>
          <input id={latitudeId} name="latitude" type="number" min={-90} max={90} step="any" required />
          <label htmlFor={longitudeId}>Longitude (−180 to 180°)</label>
          <input id={longitudeId} name="longitude" type="number" min={-180} max={180} step="any" required />
          <button type="submit">Select location</button>
          <button type="button" disabled={!selection} onClick={() => onLocationSelect(null)}>Clear selection</button>
        </div>
      </fieldset>
    </form>}
    {!surfaceTexture && <p>Untextured reference globe; no scientific data is represented by its surface.</p>}
    {surfaceTexture && <p>{surfaceTexture.attribution}{surfaceTexture.sourceUrl && <>
      {' '}<a href={surfaceTexture.sourceUrl}>Image source</a>
    </>}</p>}
    {layerDescription && <p>{layerDescription}</p>}
    {onLocationSelect && <p>A selected coordinate must be resolved by the chapter’s data adapter before displaying measurements or playing audio.</p>}
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

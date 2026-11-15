import { useId, useState } from 'react'
import { MapViewer } from '../map/MapViewer'
import type { MapViewerProps } from '../map/types'
import { useNightLights } from '../map/hooks/useNightLights'
import { useNightLightsImages } from '../map/hooks/useNightLightsImages'
import { NightLightsLayer } from '../map/layers/NightLightsLayer'
import { sampleNightLights } from '../../../data/adapters/nightLights'
import '../map/night-lights.css'
import { GlobeViewer } from '../globe'
import { NightLightsGlobeLayer } from '../globe/layers/NightLightsGlobeLayer'
import { getNightLightsBlend } from './yearBlend'
import type { GlobeContentState } from '../globe'

export interface NightLightsVisualizationProps extends Omit<MapViewerProps, 'layers' | 'contentState' | 'layerDescription'> {
  view?: 'globe' | 'map'
  year?: number
  onYearChange?: (year: number) => void
}

export function NightLightsVisualization({ year: controlledYear, onYearChange, view = 'map', ...props }: NightLightsVisualizationProps) {
  const { result, retry } = useNightLights()
  const imagery = useNightLightsImages()
  const [localYear, setLocalYear] = useState(2012)
  const { year } = getNightLightsBlend(controlledYear ?? localYear)
  const yearId = useId()
  const frame = result.status === 'ready' ? result.data.frames.find((frame) => frame.year === Math.round(year)) : undefined
  const sample = frame && props.selectedLocation ? sampleNightLights(frame, props.selectedLocation) : null
  const ready = result.status === 'ready' && imagery.result.status === 'ready'
  const failed = result.status === 'error' || imagery.result.status === 'error'
  const locked = props.interactionLocked || !ready
  const images = imagery.result.status === 'ready' ? imagery.result.images : null
  const controls = (<div className="night-lights-controls">
      <div className="night-lights-controls__row">
        <label htmlFor={yearId}>Year</label>
        <output htmlFor={yearId}>{Math.round(year)}</output>
        <input id={yearId} type="range" min={2012} max={2023} step={0.01} value={year} disabled={locked}
          aria-valuetext={Number.isInteger(year) ? `${year}` : `Transition from ${Math.floor(year)} to ${Math.ceil(year)}`}
          onChange={(event) => { const next = Number(event.target.value); if (onYearChange) onYearChange(next); else setLocalYear(next) }} />
        {failed && <button type="button" className="viewer-retry" disabled={props.interactionLocked} onClick={() => {
          if (result.status === 'error') retry()
          if (imagery.result.status === 'error') imagery.retry()
        }}>Retry Image</button>}
      </div>
      <p className="viewer-instructions-sr" role="status" aria-live="polite">{!ready ? 'Brightness sample unavailable.' : !props.selectedLocation ? 'Select a location to inspect brightness.'
        : sample?.value == null ? `${frame?.year}: no covered sample at this location.`
          : `${frame?.year}: brightness ${sample.value.toFixed(4)}; extracted coverage ${(sample.coverage * 100).toFixed(1)}%.`}</p>
    </div>)

  const contentState: GlobeContentState = ready ? { status: 'ready' } : failed
    ? { status: 'error', message: 'Night Light could not be loaded.' }
    : { status: 'loading', message: 'Loading night lights…' }
  const common = {
    embedded: props.embedded, className: props.className, label: props.label,
    interactionLocked: props.interactionLocked, selectedLocation: props.selectedLocation,
    onLocationSelect: props.onLocationSelect, footerActions: props.footerActions,
    loadErrorMessage: 'Night Light could not be loaded.', footerSecondary: controls, contentState,
    layerDescription: "NASA annual night-light imagery from 2012 to 2023. Moving the year slider blends adjacent annual images; transitions do not represent additional observations. The extracted grid provides a separate coarse brightness lookup.",
  }
  const decodedImages = imagery.result.status === 'ready' ? imagery.result.decodedImages : null
  return view === 'globe'
    ? <GlobeViewer {...common} surfaceTexture={props.surfaceImage}
        layers={decodedImages ? context => <NightLightsGlobeLayer {...context} year={year} images={decodedImages} /> : undefined} />
    : <MapViewer {...common} surfaceImage={props.surfaceImage}
        layers={images ? context => <NightLightsLayer {...context} year={year} images={images} /> : undefined} />
}

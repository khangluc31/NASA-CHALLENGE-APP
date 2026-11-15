import { useId, useState } from 'react'
import { MapViewer } from './MapViewer'
import type { MapViewerProps } from './types'
import { useNightLights } from './hooks/useNightLights'
import { useNightLightsImages } from './hooks/useNightLightsImages'
import { NightLightsLayer } from './layers/NightLightsLayer'
import { sampleNightLights } from '../../../data/adapters/nightLights'
import './night-lights.css'

interface NightLightsMapProps extends Omit<MapViewerProps, 'layers' | 'contentState' | 'layerDescription'> {
  year?: number
  onYearChange?: (year: number) => void
}

export function NightLightsMap({ year: controlledYear, onYearChange, ...props }: NightLightsMapProps) {
  const { result, retry } = useNightLights()
  const imagery = useNightLightsImages()
  const [localYear, setLocalYear] = useState(2012)
  const year = controlledYear ?? localYear
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
        }}>Retry lights</button>}
      </div>
      <p className="viewer-instructions-sr" role="status" aria-live="polite">{!ready ? 'Brightness sample unavailable.' : !props.selectedLocation ? 'Select a location to inspect brightness.'
        : sample?.value == null ? `${frame?.year}: no covered sample at this location.`
          : `${frame?.year}: brightness ${sample.value.toFixed(4)}; extracted coverage ${(sample.coverage * 100).toFixed(1)}%.`}</p>
    </div>)

  return <MapViewer {...props}
      footerSecondary={controls}
      contentState={ready ? { status: 'ready' } : failed
        ? { status: 'error', message: 'Night Lights could not be loaded.' }
        : { status: 'loading', message: 'Loading night lights…' }}
      layers={images ? (context) => <NightLightsLayer {...context} year={year} images={images} /> : undefined}
      layerDescription="NASA annual night-light imagery from 2012 to 2023. Moving the year slider blends adjacent annual images; transitions do not represent additional observations. The extracted grid provides a separate coarse brightness lookup." />
}

import type { BookSlotProps } from '../book/types'
import { VisualizationPreview } from '../book/components/BookPlaceholders'
import { GlobeViewer } from './globe'
import type { GlobeLocation } from './globe'
import { MapViewer } from './map'
import { BLUE_MARBLE_TEXTURE } from './globe/surfaceTexture'
import './visualization.css'

const BLACK_MARBLE = {
  path: 'textures/black-marble-2016-3600.jpg',
  attribution: 'NASA Earth Observatory / Joshua Stevens, using Suomi NPP VIIRS data from Miguel Román, NASA GSFC. Black Marble, 2016. Historical background, not the 2012–2023 comparison.',
  sourceUrl: 'https://science.nasa.gov/earth/earth-observatory/earth-at-night/maps/',
}

interface HostProps extends BookSlotProps {
  view?: 'globe' | 'map'
  location: GlobeLocation | null
  onViewChange: (view: 'globe' | 'map') => void
  onLocationSelect: (location: GlobeLocation | null) => void
}

export function VisualizationHost({ chapter, isActive, interactionDisabled, view, location, onViewChange, onLocationSelect }: HostProps) {
  if (chapter.viewer === 'media') return <VisualizationPreview chapter={chapter} />
  const views = chapter.supportedViews ?? [chapter.viewer]
  const activeView = view && views.includes(view) ? view : chapter.viewer
  const locked = !isActive || interactionDisabled
  const surface = chapter.id === 'night-lights' ? BLACK_MARBLE : BLUE_MARBLE_TEXTURE
  const common = {
    embedded: true, interactionLocked: locked, selectedLocation: location,
    onLocationSelect, label: `${chapter.shortTitle}: ${activeView} exploration`,
  }
  return <section className="book-visualization" aria-label="Chapter visualization">
    <div className="book-visualization__toolbar">
      <span>REFERENCE EARTH</span>
      {views.length > 1 ? <div role="group" aria-label="Visualization view">{views.map(item =>
        <button key={item} type="button" aria-pressed={activeView === item} disabled={locked}
          onClick={() => onViewChange(item)}>{item === 'globe' ? 'Globe' : 'Map'}</button>)}</div>
        : <span>{activeView === 'globe' ? 'GLOBE' : 'MAP'}</span>}
    </div>
    {activeView === 'globe'
      ? <GlobeViewer key={`${chapter.id}:globe`} {...common} surfaceTexture={surface} />
      : <MapViewer key={`${chapter.id}:map`} {...common} surfaceImage={surface} />}
    <p className="book-visualization__caption">Historical background · Scientific layers not connected</p>
  </section>
}

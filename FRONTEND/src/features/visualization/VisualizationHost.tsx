import type { BookSlotProps } from '../book/types'
import { VisualizationPreview } from '../book/components/BookPlaceholders'
import { GlobeViewer } from './globe'
import type { GlobeLocation } from './globe'
import { MapViewer } from './map'
import { BLUE_MARBLE_TEXTURE } from './globe/surfaceTexture'
import './visualization.css'

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
  const nextView = views.find(item => item !== activeView)
  const locked = !isActive || interactionDisabled
  // Lights must come from the future data layer, not baked-in reference imagery.
  const surface = BLUE_MARBLE_TEXTURE
  const common = {
    embedded: true, interactionLocked: locked, selectedLocation: location,
    onLocationSelect, label: `${chapter.shortTitle}: ${activeView} exploration`,
  }
  return <section className="book-visualization" aria-label="Chapter visualization">
    <div className="book-visualization__toolbar">
      <span>REFERENCE EARTH</span>
      {nextView ? <button className="book-visualization__mode" type="button" disabled={locked}
        aria-label={`Current view: ${activeView}. Switch to ${nextView} view`}
        title={`Switch to ${nextView} view`} onClick={() => onViewChange(nextView)}>
        {activeView === 'globe' ? 'GLOBE' : 'MAP'}
      </button> : <span className="book-visualization__mode">{activeView === 'globe' ? 'GLOBE' : 'MAP'}</span>}
    </div>
    {activeView === 'globe'
      ? <GlobeViewer key={`${chapter.id}:globe`} {...common} surfaceTexture={surface} />
      : <MapViewer key={`${chapter.id}:map`} {...common} surfaceImage={surface} />}
    <p className="book-visualization__caption">Historical background · Layers pending</p>
  </section>
}

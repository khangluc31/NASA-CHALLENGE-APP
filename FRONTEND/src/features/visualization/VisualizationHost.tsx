import type { BookSlotProps } from '../book/types'
import { VisualizationPreview } from '../book/components/BookPlaceholders'
import { GlobeViewer } from './globe'
import type { GlobeLocation } from './globe'
import { MapViewer } from './map'
import { NightLightsMap } from './map/NightLightsMap'
import { OceanVisualization } from './ocean/OceanVisualization'
import { CarbonDioxideVisualization } from './carbon-dioxide/CarbonDioxideVisualization'
import { BLUE_MARBLE_TEXTURE } from './globe/surfaceTexture'
import './visualization.css'
import type { CarbonDioxideView } from './carbon-dioxide/useCurrentView'
import type { VideoCurrentView } from './media/useCurrentView'

interface HostProps extends BookSlotProps {
  view?: 'globe' | 'map'
  location: GlobeLocation | null
  onViewChange: (view: 'globe' | 'map') => void
  onLocationSelect: (location: GlobeLocation | null) => void
  nightLightsYear?: number
  onNightLightsYearChange?: (year: number) => void
  onCarbonDioxideViewChange?: (view: CarbonDioxideView) => void
  onOceanViewChange?: (view: VideoCurrentView) => void
}

export function VisualizationHost({ chapter, isActive, interactionDisabled, view, location, onViewChange, onLocationSelect, nightLightsYear, onNightLightsYearChange, onCarbonDioxideViewChange, onOceanViewChange }: HostProps) {
  if (chapter.viewer === 'media') return <VisualizationPreview chapter={chapter} />
  const views = chapter.supportedViews ?? [chapter.viewer]
  const activeView = view && views.includes(view) ? view : chapter.viewer
  const nextView = views.find(item => item !== activeView)
  const locked = !isActive || interactionDisabled
  // Chapter layers remain separate from the shared geographic reference imagery.
  const surface = BLUE_MARBLE_TEXTURE
  const common = {
    embedded: true, interactionLocked: locked, selectedLocation: location,
    onLocationSelect, label: `${chapter.shortTitle}: ${activeView} exploration`,
  }
  return <section className="book-visualization" aria-label="Chapter visualization">
    {nextView && <div className="book-visualization__toolbar">
      <button className="book-visualization__mode" type="button" disabled={locked}
        aria-label={`Current view: ${activeView}. Switch to ${nextView} view`}
        title={`Switch to ${nextView} view`} onClick={() => onViewChange(nextView)}>
        Switch view
      </button>
    </div>}
    {chapter.id === 'carbon-dioxide'
      ? <CarbonDioxideVisualization key={chapter.id} {...common} view={activeView === 'map' ? 'map' : 'globe'} onCurrentViewChange={onCarbonDioxideViewChange} />
      : chapter.id === 'ocean-temperature'
      ? <OceanVisualization key={chapter.id} {...common} view={activeView === 'map' ? 'map' : 'globe'} onCurrentViewChange={onOceanViewChange} />
      : activeView === 'globe'
      ? <GlobeViewer key={`${chapter.id}:globe`} {...common} surfaceTexture={surface} />
      : chapter.id === 'night-lights'
        ? <NightLightsMap key={`${chapter.id}:map`} {...common} surfaceImage={surface} year={nightLightsYear} onYearChange={onNightLightsYearChange} />
        : <MapViewer key={`${chapter.id}:map`} {...common} surfaceImage={surface} />}
  </section>
}

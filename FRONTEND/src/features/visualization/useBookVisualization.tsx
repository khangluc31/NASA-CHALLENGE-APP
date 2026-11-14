import { useState } from 'react'
import type { BookSlotProps } from '../book/types'
import type { GlobeLocation } from './globe'
import { VisualizationHost } from './VisualizationHost'

interface ChapterViewState {
  view?: 'globe' | 'map'
  location?: GlobeLocation | null
}

/** Lives above book slots, which intentionally unmount during page turns. */
export function useBookVisualization() {
  const [chapters, setChapters] = useState<Record<string, ChapterViewState>>({})
  return {
    renderVisualization: (slot: BookSlotProps) => <VisualizationHost
      {...slot}
      view={chapters[slot.chapter.id]?.view}
      location={chapters[slot.chapter.id]?.location ?? null}
      onViewChange={view => setChapters(previous => ({ ...previous, [slot.chapter.id]: { ...previous[slot.chapter.id], view } }))}
      onLocationSelect={location => setChapters(previous => ({ ...previous, [slot.chapter.id]: { ...previous[slot.chapter.id], location } }))}
    />,
  }
}

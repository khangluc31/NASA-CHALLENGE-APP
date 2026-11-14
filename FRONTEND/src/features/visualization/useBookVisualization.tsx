import { useState } from 'react'
import type { BookSlotProps } from '../book/types'
import type { GlobeLocation } from './globe'
import { VisualizationHost } from './VisualizationHost'
import { ChapterNotes } from '../chapter/ChapterNotes'
import { NightLightsInspector } from '../chapter/NightLightsInspector'
import { BOOK_CHAPTERS } from '../book/chapters'

interface ChapterViewState {
  view?: 'globe' | 'map'
  location?: GlobeLocation | null
  nightLightsYear?: number
  selectionRevision?: number
}

/** Lives above book slots, which intentionally unmount during page turns. */
export function useBookVisualization() {
  const [chapters, setChapters] = useState<Record<string, ChapterViewState>>({})
  return {
    renderVisualization: (slot: BookSlotProps) => <VisualizationHost
      {...slot}
      view={chapters[slot.chapter.id]?.view}
      location={chapters[slot.chapter.id]?.location ?? null}
      nightLightsYear={chapters[slot.chapter.id]?.nightLightsYear ?? 2012}
      onNightLightsYearChange={nightLightsYear => setChapters(previous => ({ ...previous, [slot.chapter.id]: { ...previous[slot.chapter.id], nightLightsYear } }))}
      onViewChange={view => setChapters(previous => ({ ...previous, [slot.chapter.id]: { ...previous[slot.chapter.id], view } }))}
      onLocationSelect={location => setChapters(previous => ({ ...previous, [slot.chapter.id]: { ...previous[slot.chapter.id], location,
        selectionRevision: (previous[slot.chapter.id]?.selectionRevision ?? 0) + 1 } }))}
    />,
    renderInspector: (slot: BookSlotProps) => {
      const state = chapters[slot.chapter.id]
      const location = state?.location
      const selected = slot.chapter.id === 'night-lights' && location
      return <ChapterNotes key={slot.chapter.id} chapter={slot.chapter}
        number={String(BOOK_CHAPTERS.findIndex(chapter => chapter.id === slot.chapter.id) + 1).padStart(2, '0')}
        selectionKey={slot.chapter.id === 'night-lights' ? String(state?.selectionRevision ?? 0) : null}
        selectedArea={selected ? <NightLightsInspector location={location} year={state.nightLightsYear ?? 2012}
          disabled={!slot.isActive || slot.interactionDisabled}
          onClear={() => setChapters(previous => ({ ...previous, [slot.chapter.id]: { ...previous[slot.chapter.id], location: null,
            selectionRevision: (previous[slot.chapter.id]?.selectionRevision ?? 0) + 1 } }))} /> : undefined} />
    },
  }
}

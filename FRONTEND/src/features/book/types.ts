import type { ReactNode } from 'react'

/** Book-owned presentation metadata; not a scientific dataset contract. */
export interface BookChapter {
  id: string
  title: string
  shortTitle: string
  category: string
  viewer: 'globe' | 'map' | 'media'
  introduction: string
  previewUrl?: string
  sourceUrl?: string
}
export type BookPhase = 'ready' | 'leaving' | 'flipping' | 'loading' | 'error'
export interface BookSlotProps {
  chapter: BookChapter
  isActive: boolean
  interactionDisabled: boolean
}
export interface EarthBookProps {
  chapters?: readonly BookChapter[]
  initialChapterId?: string
  onClose: () => void
  /** Suspend interaction/audio while the cover is opening, closing, or closed. */
  presented?: boolean
  /** Render one live viewer only. Keep the same component type between renders. */
  renderVisualization?: (props: BookSlotProps) => ReactNode
  renderAudio?: (props: BookSlotProps) => ReactNode
  renderInspector?: (props: BookSlotProps) => ReactNode
  /** Fade/stop audio before the flip. Must also stop audio on viewer unmount. */
  onBeforeChapterChange?: (chapter: BookChapter, signal: AbortSignal) => void | Promise<void>
  /** Resolve only when data is usable. Honor signal to cancel stale requests. */
  prepareChapter?: (chapter: BookChapter, signal: AbortSignal) => Promise<void>
  onChapterChange?: (chapter: BookChapter) => void
}

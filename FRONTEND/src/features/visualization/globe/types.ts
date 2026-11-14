import type { ReactNode } from 'react'

/** Viewer coordinates only; a location is not a scientific sample. */
export interface GlobeLocation {
  latitude: number
  longitude: number
}

export interface GlobeLayerContext {
  radius: number
  interactionLocked: boolean
  selectedLocation: GlobeLocation | null
}

export type GlobeContentState =
  | { status: 'ready' }
  | { status: 'loading' | 'empty' | 'missing' | 'error'; message: string }

export interface GlobeViewerProps {
  /** Compact layout for the book; controls remain available in a disclosure. */
  embedded?: boolean
  className?: string
  label?: string
  interactionLocked?: boolean
  selectedLocation?: GlobeLocation | null
  onLocationSelect?: (location: GlobeLocation | null) => void
  /** Defaults to NASA Blue Marble. Use null for an untextured reference sphere. */
  surfaceTexture?: { path: string; attribution: string; sourceUrl?: string } | null
  /** R3F elements in the globe's unrotated, unit-radius coordinate system. */
  layers?: (context: GlobeLayerContext) => ReactNode
  contentState?: GlobeContentState
  /** Human-readable explanation of chapter encodings; never rely on color alone. */
  layerDescription?: string
}

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
  /** Compact book layout with model-based selection and a shared footer. */
  embedded?: boolean
  footerActions?: ReactNode
  footerSecondary?: ReactNode
  className?: string
  label?: string
  /** Chapter-specific copy for image and renderer failures. */
  loadErrorMessage?: string
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

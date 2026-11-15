import type { ReactNode } from 'react'
import type { GlobeLocation, GlobeContentState, GlobeViewerProps } from '../globe/types'

/** Viewer coordinates only; the caller resolves scientific samples. */
export type MapLocation = GlobeLocation
export type MapContentState = GlobeContentState
export type MapSurfaceImage = NonNullable<GlobeViewerProps['surfaceTexture']>

export interface MapPoint { x: number; y: number }
export interface MapView { zoom: number; x: number; y: number }
export type MapNavigationAction = 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'reset'

export interface MapLayerContext {
  width: number
  height: number
  project: (location: MapLocation) => MapPoint
  unproject: (point: MapPoint) => MapLocation
  selectedLocation: MapLocation | null
  interactionLocked: boolean
}

export interface MapViewerProps {
  embedded?: boolean
  footerActions?: ReactNode
  footerSecondary?: ReactNode
  className?: string
  label?: string
  /** Chapter-specific copy for image and renderer failures. */
  loadErrorMessage?: string
  interactionLocked?: boolean
  selectedLocation?: MapLocation | null
  onLocationSelect?: (location: MapLocation | null) => void
  /** Approved global equirectangular image; null shows a reference grid. */
  surfaceImage?: MapSurfaceImage | null
  contentState?: MapContentState
  /** SVG elements in the map's 720 × 360 coordinate system. */
  layers?: (context: MapLayerContext) => ReactNode
  layerDescription?: string
}

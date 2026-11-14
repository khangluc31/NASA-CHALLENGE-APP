import type { GlobeViewerProps } from './types'

/** Historical reference imagery; never use surface colors as chapter measurements. */
export const BLUE_MARBLE_TEXTURE: NonNullable<GlobeViewerProps['surfaceTexture']> = {
  path: 'textures/blue-marble-2004-01-2048.jpg',
  attribution: 'NASA Earth Observatory — Blue Marble: Next Generation, January 2004. Produced by Reto Stöckli. Historical reference imagery.',
  sourceUrl: 'https://science.nasa.gov/earth/earth-observatory/blue-marble-next-generation/',
}

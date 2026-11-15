import { NightLightsVisualization } from '../night-lights/NightLightsVisualization'
import type { NightLightsVisualizationProps } from '../night-lights/NightLightsVisualization'

/** Retain the standalone map entry point; the book uses the shared chapter host. */
export function NightLightsMap(props: Omit<NightLightsVisualizationProps, 'view'>) {
  return <NightLightsVisualization {...props} view="map" />
}

import type { MapLayerContext } from '../types'
import { MapVideoLayer } from './MapVideoLayer'

export function OceanMapLayer(props: MapLayerContext & { video: HTMLVideoElement }) {
  return <MapVideoLayer {...props} label="NASA animated surface currents colored by temperature" />
}

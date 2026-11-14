import type { GlobeLocation } from '../types'
import { locationToPosition } from '../utils/coordinates'

export function SelectionMarker({ location }: { location: GlobeLocation }) {
  return <mesh position={locationToPosition(location, 1.015)} raycast={() => {}}>
    <sphereGeometry args={[0.022, 16, 12]} />
    <meshBasicMaterial color="white" />
    <mesh raycast={() => {}}>
      <sphereGeometry args={[0.03, 12, 8]} />
      <meshBasicMaterial color="black" wireframe />
    </mesh>
  </mesh>
}

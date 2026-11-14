import type { GlobeLocation } from '../types'
import { locationToPosition } from '../utils/coordinates'
import { Billboard } from '@react-three/drei'

export function SelectionMarker({ location }: { location: GlobeLocation }) {
  return <Billboard position={locationToPosition(location, 1.008)}>
    {/* A camera-facing disc stays flat; depth testing hides it behind Earth. */}
    <mesh raycast={() => {}}>
      <circleGeometry args={[0.026, 32]} />
      <meshBasicMaterial color="#ffd078" toneMapped={false} />
    </mesh>
  </Billboard>
}

import type { GlobeLocation } from '../types'
import { locationToPosition } from '../utils/coordinates'
import { Billboard } from '@react-three/drei'
import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { PerspectiveCamera, Shape, Vector3 } from 'three'
import type { Group } from 'three'

export function SelectionMarker({ location }: { location: GlobeLocation }) {
  const marker = useRef<Group>(null)
  const pin = useRef<Group>(null)
  const position = useMemo(() => new Vector3(...locationToPosition(location, 1.008)), [location])
  const toCamera = useMemo(() => new Vector3(), [])
  const shape = useMemo(() => {
    const pin = new Shape()
    pin.moveTo(0, 0)
    pin.bezierCurveTo(-4, 6, -11, 15, -11, 22)
    pin.absarc(0, 22, 11, Math.PI, 0, true)
    pin.bezierCurveTo(11, 15, 4, 6, 0, 0)
    pin.closePath()
    return pin
  }, [])
  useFrame(({ camera, size }) => {
    // Hide the entire pin when its anchor is on Earth's far side.
    if (marker.current) marker.current.visible = position.dot(toCamera.copy(camera.position).sub(position)) > 0
    if (pin.current && camera instanceof PerspectiveCamera && size.height > 0) {
      // Match the map's zoom-independent pin size in CSS pixels, not world units.
      const depth = Math.abs(toCamera.copy(position).applyMatrix4(camera.matrixWorldInverse).z)
      const worldPerPixel = 2 * depth / (camera.projectionMatrix.elements[5] * size.height)
      pin.current.scale.setScalar(22 * worldPerPixel / 33)
    }
  })
  return <Billboard ref={marker} position={position}>
    {/* The pin's tip, rather than its center, anchors the selected coordinate. */}
    <group ref={pin} scale={0.0035}>
      <mesh raycast={() => {}}>
        <shapeGeometry args={[shape]} />
        <meshBasicMaterial color="#ea4335" toneMapped={false} />
      </mesh>
      <mesh position={[0, 22, 0.05]} raycast={() => {}}>
        <circleGeometry args={[4, 24]} />
        <meshBasicMaterial color="white" toneMapped={false} />
      </mesh>
    </group>
  </Billboard>
}

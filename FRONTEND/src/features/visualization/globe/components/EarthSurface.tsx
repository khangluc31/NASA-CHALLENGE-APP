import { useRef } from 'react'
import type { ThreeEvent } from '@react-three/fiber'
import type { Texture } from 'three'
import type { GlobeLocation } from '../types'
import { positionToLocation } from '../utils/coordinates'

interface EarthSurfaceProps {
  texture?: Texture
  onSelect?: (location: GlobeLocation) => void
}

export function EarthSurface({ texture, onSelect }: EarthSurfaceProps) {
  const gesture = useRef<{ x: number; y: number; pointerId: number; moved: boolean } | null>(null)

  function trackMovement(event: ThreeEvent<PointerEvent>) {
    const start = gesture.current
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 5) {
      start.moved = true
    }
  }

  return (
    <mesh
      onPointerDown={(event) => {
        gesture.current = event.button === 0 && event.isPrimary
          ? { x: event.clientX, y: event.clientY, pointerId: event.pointerId, moved: false }
          : null
      }}
      onPointerMove={trackMovement}
      onPointerOut={() => { gesture.current = null }}
      onPointerUp={(event) => {
        trackMovement(event)
        const start = gesture.current
        gesture.current = null
        if (!onSelect || !start || start.moved || event.pointerId !== start.pointerId || event.delta > 5) return
        const localPoint = event.object.worldToLocal(event.point.clone())
        onSelect(positionToLocation(localPoint))
      }}
    >
      <sphereGeometry args={[1, 64, 32]} />
      {/* Uniform illumination avoids suggesting that decorative light is scientific data. */}
      <meshBasicMaterial map={texture ?? null} color={texture ? 'white' : '#808080'} wireframe={!texture} />
    </mesh>
  )
}

import { useImperativeHandle } from 'react'
import type { Ref } from 'react'
import { useThree } from '@react-three/fiber'
import { Raycaster, Sphere, Vector2, Vector3 } from 'three'
import type { GlobeLocation } from '../types'
import { positionToLocation } from '../utils/coordinates'

export interface GlobeKeyboardSelectionHandle { select: () => void }

/** Deliberate Enter selection at the view center; navigation alone never samples. */
export function GlobeKeyboardSelection({ ref, onSelect }: {
  ref: Ref<GlobeKeyboardSelectionHandle>; onSelect?: (location: GlobeLocation) => void
}) {
  const camera = useThree(state => state.camera)
  useImperativeHandle(ref, () => ({ select() {
    if (!onSelect) return
    const raycaster = new Raycaster()
    raycaster.setFromCamera(new Vector2(0, 0), camera)
    const point = raycaster.ray.intersectSphere(new Sphere(new Vector3(), 1), new Vector3())
    if (point) onSelect(positionToLocation(point))
  } }), [camera, onSelect])
  return null
}

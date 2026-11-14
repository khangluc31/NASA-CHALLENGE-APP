import { useImperativeHandle, useRef } from 'react'
import type { ComponentRef, Ref } from 'react'
import { OrbitControls } from '@react-three/drei'

export type CameraAction = 'left' | 'right' | 'up' | 'down' | 'in' | 'out' | 'reset'
export interface GlobeCameraHandle { act: (action: CameraAction) => void }

export function GlobeCameraControls({ locked, ref }: { locked: boolean; ref: Ref<GlobeCameraHandle> }) {
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null)
  useImperativeHandle(ref, () => ({
    act(action) {
      const orbit = controls.current
      if (locked || !orbit) return
      const step = Math.PI / 12
      switch (action) {
        case 'left': orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() - step); break
        case 'right': orbit.setAzimuthalAngle(orbit.getAzimuthalAngle() + step); break
        case 'up': orbit.setPolarAngle(orbit.getPolarAngle() - step); break
        case 'down': orbit.setPolarAngle(orbit.getPolarAngle() + step); break
        case 'in': orbit.dollyIn(1 / 1.2); break
        case 'out': orbit.dollyOut(1 / 1.2); break
        case 'reset': orbit.reset(); break
      }
      orbit.update()
    },
  }), [locked])

  return <OrbitControls ref={controls} enabled={!locked} enablePan={false}
    enableDamping={false} autoRotate={false} minDistance={1.5} maxDistance={6}
    minPolarAngle={0.01} maxPolarAngle={Math.PI - 0.01} makeDefault />
}

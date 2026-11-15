import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { SRGBColorSpace, VideoTexture } from 'three'
import type { MeshBasicMaterial } from 'three'
import type { GlobeLayerContext } from '../types'
import { observeVideoFrames } from '../../ocean/videoFrames'

export function OceanGlobeLayer({ video, radius }: GlobeLayerContext & { video: HTMLVideoElement }) {
  const material = useRef<MeshBasicMaterial>(null)
  const invalidate = useThree(state => state.invalidate)
  useEffect(() => {
    const texture = new VideoTexture(video)
    texture.colorSpace = SRGBColorSpace
    const target = material.current
    if (target) { target.map = texture; target.needsUpdate = true }
    const stop = observeVideoFrames(video, () => { texture.needsUpdate = true; invalidate() })
    return () => {
      stop()
      if (target) { target.map = null; target.needsUpdate = true }
      texture.dispose()
    }
  }, [video, invalidate])
  return <mesh raycast={() => null}>
    <sphereGeometry args={[radius * 1.001, 64, 32]} />
    <meshBasicMaterial ref={material} toneMapped={false} />
  </mesh>
}

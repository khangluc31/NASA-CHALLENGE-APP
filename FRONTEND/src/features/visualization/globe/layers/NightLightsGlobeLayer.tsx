import { useLayoutEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import { CanvasTexture, CustomBlending, OneFactor, OneMinusSrcColorFactor, SRGBColorSpace, ZeroFactor } from 'three'
import type { MeshBasicMaterial } from 'three'
import type { GlobeLayerContext } from '../types'
import { getNightLightsBlend } from '../../night-lights/yearBlend'

export function NightLightsGlobeLayer({ radius, year, images }: GlobeLayerContext & { year: number; images: HTMLImageElement[] }) {
  const material = useRef<MeshBasicMaterial>(null)
  const surface = useRef<{ context: CanvasRenderingContext2D; texture: CanvasTexture } | null>(null)
  const invalidate = useThree(state => state.invalidate)
  useLayoutEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 2048
    canvas.height = 1024
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Night Lights globe rendering unavailable.')
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    const target = material.current
    if (target) { target.map = texture; target.needsUpdate = true }
    surface.current = { context, texture }
    return () => {
      surface.current = null
      if (target) { target.map = null; target.needsUpdate = true }
      texture.dispose()
    }
  }, [])
  useLayoutEffect(() => {
    if (!surface.current) return
    const { context, texture } = surface.current
    const { lower, upper, blend } = getNightLightsBlend(year)
    context.globalAlpha = 1
    context.drawImage(images[lower], 0, 0, 2048, 1024)
    if (upper !== lower && blend > 0) {
      context.globalAlpha = blend
      context.drawImage(images[upper], 0, 0, 2048, 1024)
      context.globalAlpha = 1
    }
    texture.needsUpdate = true
    invalidate()
  }, [images, year, invalidate])
  return <>
    <mesh raycast={() => null} renderOrder={1}>
      <sphereGeometry args={[radius * 1.001, 64, 32]} />
      <meshBasicMaterial color="black" transparent opacity={0.86} depthWrite={false} toneMapped={false} />
    </mesh>
    <mesh raycast={() => null} renderOrder={2}>
      <sphereGeometry args={[radius * 1.002, 64, 32]} />
      {/* Screen blend: source + destination × (1 − source), matching the map's lights group. */}
      <meshBasicMaterial ref={material} transparent depthWrite={false} toneMapped={false}
        blending={CustomBlending} blendSrc={OneFactor} blendDst={OneMinusSrcColorFactor}
        blendSrcAlpha={ZeroFactor} blendDstAlpha={OneFactor} />
    </mesh>
  </>
}

import { useEffect, useRef } from 'react'
import type { MapLayerContext } from '../types'
import { observeVideoFrames } from '../../ocean/videoFrames'

export function OceanMapLayer({ video, width, height }: MapLayerContext & { video: HTMLVideoElement }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) throw new Error('Ocean map rendering is unavailable.')
    return observeVideoFrames(video, () => context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight))
  }, [video])
  return <foreignObject width={width} height={height} pointerEvents="none" aria-label="NASA animated surface currents colored by temperature">
    <canvas ref={canvas} width={video.videoWidth} height={video.videoHeight}
      style={{ display: 'block', width: '100%', height: '100%' }} />
  </foreignObject>
}

import { useEffect, useRef } from 'react'
import type { MapLayerContext } from '../types'
import { observeVideoFrames } from '../../media/videoFrames'

/** Renderer only: the chapter retains ownership of video and playback intent. */
export function MapVideoLayer({ video, width, height, label }: MapLayerContext & { video: HTMLVideoElement; label: string }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) throw new Error('Map video rendering is unavailable.')
    return observeVideoFrames(video, () => context.drawImage(video, 0, 0, video.videoWidth, video.videoHeight))
  }, [video])
  return <foreignObject width={width} height={height} pointerEvents="none" aria-label={label}>
    <canvas ref={canvas} width={video.videoWidth} height={video.videoHeight}
      style={{ display: 'block', width: '100%', height: '100%' }} />
  </foreignObject>
}

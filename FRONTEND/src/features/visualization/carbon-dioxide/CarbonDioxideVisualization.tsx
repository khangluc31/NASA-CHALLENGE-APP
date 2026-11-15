import { useContext, useId, useState } from 'react'
import { MotionConfigContext, useReducedMotion } from 'motion/react'
import { GlobeViewer } from '../globe'
import type { GlobeViewerProps } from '../globe'
import { GlobeVideoLayer } from '../globe/layers/GlobeVideoLayer'
import { useVideoPlayback } from '../media/useVideoPlayback'
import { VideoPlaybackControls } from '../media/VideoPlaybackControls'
import './carbon-dioxide.css'

const SOURCE = `${import.meta.env.BASE_URL}media/carbon-dioxide/dyamond-co2-4096.mp4`
const COLORBAR = `${import.meta.env.BASE_URL}media/carbon-dioxide/colorbar.png`
type Props = Pick<GlobeViewerProps, 'selectedLocation' | 'onLocationSelect' | 'interactionLocked' | 'label'>

export function CarbonDioxideVisualization(props: Props) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const systemReduced = useReducedMotion()
  const motion = useContext(MotionConfigContext)
  const reduced = motion.reducedMotion === 'always' || (motion.reducedMotion !== 'never' && Boolean(systemReduced))
  const playback = useVideoPlayback(video, SOURCE, Boolean(props.interactionLocked), reduced)
  const legendId = useId()
  return <>
    <video ref={setVideo} hidden muted loop playsInline preload="auto" data-co2-video aria-hidden="true" />
    <GlobeViewer {...props} embedded
      contentState={playback.status === 'ready' ? { status: 'ready' } : playback.status === 'error'
        ? { status: 'error', message: 'Carbon dioxide animation could not be loaded.' }
        : { status: 'loading', message: 'Loading carbon dioxide animation…' }}
      layers={video ? context => <GlobeVideoLayer {...context} video={video} /> : undefined}
      layerDescription="NASA DYAMOND modeled atmospheric carbon dioxide for January–March 2020. NASA's color and opacity scale spans 380–460 parts per million. Sparse or transparent regions still contain carbon dioxide. This spherical video texture does not supply altitude or measurements at selected coordinates." />
    <VideoPlaybackControls label="carbon dioxide animation" playback={playback} locked={props.interactionLocked}>
      <details className="co2-legend">
        <summary>CO₂ · 380–460 ppm</summary>
        <div className="co2-legend__panel">
          <svg viewBox="180 300 1560 420" role="img" aria-labelledby={legendId}>
            <title id={legendId}>NASA carbon dioxide color and opacity legend: 380 to 460 parts per million, pale and transparent through yellow and orange to red.</title>
            <image href={COLORBAR} width="1920" height="1080" />
          </svg>
          <p>NASA color and opacity scale. Transparent regions still contain CO₂.</p>
        </div>
      </details>
    </VideoPlaybackControls>
  </>
}

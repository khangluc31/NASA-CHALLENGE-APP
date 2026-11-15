import { useContext, useId, useState } from 'react'
import { MotionConfigContext, useReducedMotion } from 'motion/react'
import { GlobeViewer } from '../globe'
import type { GlobeViewerProps, GlobeContentState } from '../globe'
import { MapViewer } from '../map'
import { MapVideoLayer } from '../map/layers/MapVideoLayer'
import { GlobeVideoLayer } from '../globe/layers/GlobeVideoLayer'
import { useVideoPlayback } from '../media/useVideoPlayback'
import { VideoPlaybackControls } from '../media/VideoPlaybackControls'
import './carbon-dioxide.css'
import { useCurrentView } from './useCurrentView'
import type { CarbonDioxideView } from './useCurrentView'

const SOURCE = `${import.meta.env.BASE_URL}media/carbon-dioxide/dyamond-co2-4096.mp4`
const COLORBAR = `${import.meta.env.BASE_URL}media/carbon-dioxide/colorbar.png`
type Props = Pick<GlobeViewerProps, 'interactionLocked' | 'label'> & {
  view?: 'globe' | 'map'
  onCurrentViewChange?: (view: CarbonDioxideView) => void
}

export function CarbonDioxideVisualization({ onCurrentViewChange, interactionLocked, label, view = 'globe' }: Props) {
  // This chapter inspects animation frames; geographic selection is intentionally unavailable.
  const props = { interactionLocked, label }
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const systemReduced = useReducedMotion()
  const motion = useContext(MotionConfigContext)
  const reduced = motion.reducedMotion === 'always' || (motion.reducedMotion !== 'never' && Boolean(systemReduced))
  const playback = useVideoPlayback(video, SOURCE, Boolean(props.interactionLocked), reduced)
  useCurrentView(video, playback.status, props.interactionLocked, onCurrentViewChange)
  const legendId = useId()
  const contentState: GlobeContentState = playback.status === 'ready' ? { status: 'ready' } : playback.status === 'error'
    ? { status: 'error', message: 'Carbon dioxide could not be loaded.' }
    : { status: 'loading', message: 'Loading carbon dioxide animation…' }
  const common = {
    ...props, embedded: true, contentState,
    loadErrorMessage: 'Carbon dioxide could not be loaded.',
    footerActions: <VideoPlaybackControls label="carbon dioxide animation" playback={playback} locked={props.interactionLocked} />,
    footerSecondary: <figure className="co2-legend" role="img" aria-labelledby={legendId}>
        <figcaption id={legendId}>CO₂<span className="viewer-instructions-sr">: NASA color and opacity scale, 380–460 parts per million. Transparent regions still contain CO₂.</span></figcaption>
        <div className="co2-legend__scale">
          <svg viewBox="238 323 1444 216" preserveAspectRatio="none" aria-hidden="true"><image href={COLORBAR} width="1920" height="1080" /></svg>
          <div className="co2-legend__ticks" aria-hidden="true">{[380, 400, 420, 440, 460].map(value => <span key={value}>{value}</span>)}</div>
        </div>
        <span aria-hidden="true">ppm</span>
      </figure>,
    layerDescription: "NASA DYAMOND modeled atmospheric carbon dioxide for January–March 2020. NASA's color and opacity scale spans 380–460 parts per million. Sparse or transparent regions still contain carbon dioxide. The video does not supply altitude or location-specific measurements.",
  }
  return <>
    <video ref={setVideo} hidden muted loop playsInline preload="auto" data-co2-video aria-hidden="true" />
    {view === 'globe'
      ? <GlobeViewer {...common} layers={video ? context => <GlobeVideoLayer {...context} video={video} /> : undefined} />
      : <MapViewer {...common} layers={video ? context => <MapVideoLayer {...context} video={video} label="NASA animated atmospheric carbon dioxide" /> : undefined} />}
  </>
}

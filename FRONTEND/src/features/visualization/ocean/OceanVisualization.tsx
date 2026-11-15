import { useContext, useState } from 'react'
import { MotionConfigContext, useReducedMotion } from 'motion/react'
import { GlobeViewer } from '../globe'
import type { GlobeViewerProps } from '../globe'
import { MapViewer } from '../map'
import { OceanGlobeLayer } from '../globe/layers/OceanGlobeLayer'
import { OceanMapLayer } from '../map/layers/OceanMapLayer'
import { useOceanPlayback } from './useOceanPlayback'
import { VideoPlaybackControls } from '../media/VideoPlaybackControls'
import { useCurrentView } from '../media/useCurrentView'
import type { VideoCurrentView } from '../media/useCurrentView'

type Props = Pick<GlobeViewerProps, 'interactionLocked' | 'label'> & {
  view: 'globe' | 'map'
  onCurrentViewChange?: (view: VideoCurrentView) => void
}
export function OceanVisualization({ view, onCurrentViewChange, interactionLocked, label }: Props) {
  // Ocean exposes frame estimates, so neither renderer receives geographic selection props.
  const props = { interactionLocked, label }
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const systemReduced = useReducedMotion()
  const motion = useContext(MotionConfigContext)
  const reduced = motion.reducedMotion === 'always' || (motion.reducedMotion !== 'never' && Boolean(systemReduced))
  const playback = useOceanPlayback(video, Boolean(props.interactionLocked), reduced)
  useCurrentView(video, playback.status, props.interactionLocked, onCurrentViewChange)
  const contentState = playback.status === 'ready' ? { status: 'ready' as const }
    : playback.status === 'error' ? { status: 'error' as const, message: 'Ocean could not be loaded.' }
      : { status: 'loading' as const, message: 'Loading ocean animation…' }
  const common = { ...props, embedded: true, contentState, loadErrorMessage: 'Ocean could not be loaded.',
    footerActions: <VideoPlaybackControls label="ocean animation" playback={playback} locked={props.interactionLocked} />,
    footerSecondary: <div className="ocean-temperature-legend" aria-label="Surface temperature: blue 0 degrees Celsius to red 32 degrees Celsius">
      <span>Surface temperature</span><span>0°C</span><i aria-hidden="true" /><span>32°C</span>
    </div>,
    layerDescription: 'NASA ECCO2 modeled surface currents colored by sea surface temperature. Blue: 0°C; green: 10–20°C; yellow: about 25°C; red: 32°C. Pause the historical animation to inspect approximate temperature estimates in Current view.' }
  return <>
    <video ref={setVideo} hidden muted loop playsInline preload="auto" data-ocean-video aria-hidden="true" />
    {view === 'globe' ? <GlobeViewer {...common} layers={video ? context => <OceanGlobeLayer {...context} video={video} /> : undefined} />
      : <MapViewer {...common} layers={video ? context => <OceanMapLayer {...context} video={video} /> : undefined} />}

  </>
}

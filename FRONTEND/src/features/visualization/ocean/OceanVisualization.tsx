import { useContext, useState } from 'react'
import { MotionConfigContext, useReducedMotion } from 'motion/react'
import { Play, Pause } from 'lucide-react'
import { GlobeViewer } from '../globe'
import type { GlobeViewerProps } from '../globe'
import { MapViewer } from '../map'
import { OceanGlobeLayer } from '../globe/layers/OceanGlobeLayer'
import { OceanMapLayer } from '../map/layers/OceanMapLayer'
import { useOceanPlayback } from './useOceanPlayback'
import './ocean.css'

type Props = Pick<GlobeViewerProps, 'selectedLocation' | 'onLocationSelect' | 'interactionLocked' | 'label'> & { view: 'globe' | 'map' }
export function OceanVisualization({ view, ...props }: Props) {
  const [video, setVideo] = useState<HTMLVideoElement | null>(null)
  const systemReduced = useReducedMotion()
  const motion = useContext(MotionConfigContext)
  const reduced = motion.reducedMotion === 'always' || (motion.reducedMotion !== 'never' && Boolean(systemReduced))
  const playback = useOceanPlayback(video, Boolean(props.interactionLocked), reduced)
  const contentState = playback.status === 'ready' ? { status: 'ready' as const }
    : playback.status === 'error' ? { status: 'error' as const, message: 'Ocean animation could not be loaded.' }
      : { status: 'loading' as const, message: 'Loading ocean animation…' }
  const common = { ...props, embedded: true, contentState,
    layerDescription: 'NASA ECCO2 modeled surface currents colored by sea surface temperature. Blue: 0°C; green: 10–20°C; yellow: about 25°C; red: 32°C. Historical animation repeats; selected coordinates do not supply measurements.' }
  return <>
    <video ref={setVideo} hidden muted loop playsInline preload="auto" data-ocean-video aria-hidden="true" />
    {view === 'globe' ? <GlobeViewer {...common} layers={video ? context => <OceanGlobeLayer {...context} video={video} /> : undefined} />
      : <MapViewer {...common} layers={video ? context => <OceanMapLayer {...context} video={video} /> : undefined} />}
    <div className="ocean-controls">
      <button type="button" disabled={props.interactionLocked || playback.status !== 'ready'} onClick={playback.toggle}
        aria-label={playback.playing ? 'Pause ocean animation' : 'Play ocean animation'}>
        {playback.playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
        {playback.playing ? 'Pause' : 'Play'}
      </button>
      <span className="ocean-controls__legend">Surface temperature <span aria-hidden="true">0°C <i /> 32°C</span></span>
      {playback.status === 'error' && <button type="button" disabled={props.interactionLocked} onClick={playback.retry}>Retry animation</button>}
      <span role="status" aria-live="polite">{playback.blocked ? 'Press Play to start the animation.' : playback.buffering ? 'Buffering…' : ''}</span>
    </div>
  </>
}

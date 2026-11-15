import { Play, Pause } from 'lucide-react'
import type { ReactNode } from 'react'
import type { useVideoPlayback } from './useVideoPlayback'
import './video-controls.css'

export function VideoPlaybackControls({ label, playback, locked, children }: {
  label: string
  playback: ReturnType<typeof useVideoPlayback>
  locked?: boolean
  children?: ReactNode
}) {
  return <div className="video-controls">
    <button type="button" disabled={locked || playback.status !== 'ready'} onClick={playback.toggle}
      aria-label={`${playback.playing ? 'Pause' : 'Play'} ${label}`}>
      {playback.playing ? <Pause size={13} aria-hidden="true" /> : <Play size={13} aria-hidden="true" />}
      {playback.playing ? 'Pause' : 'Play'}
    </button>
    {children}
    {playback.status === 'error' && <button type="button" disabled={locked} onClick={playback.retry}>Retry animation</button>}
    <span role="status" aria-live="polite">{playback.blocked ? 'Press Play to start the animation.' : playback.buffering ? 'Buffering…' : ''}</span>
  </div>
}

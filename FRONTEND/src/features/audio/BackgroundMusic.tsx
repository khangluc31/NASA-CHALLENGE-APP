import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { hasForegroundAudio, subscribeForeground } from './audio-priority'

const SOURCE = 'https://upload.wikimedia.org/wikipedia/commons/3/3d/Kevin_MacLeod_-_Tranquility.ogg'
export function BackgroundMusic() {
  const audio = useRef<HTMLAudioElement>(null)
  const [enabled, setEnabled] = useState(true)
  const [failed, setFailed] = useState(false)
  const foreground = useSyncExternalStore(subscribeForeground, hasForegroundAudio)

  useEffect(() => {
    const player = audio.current
    if (!player) return
    let cancelled = false
    player.volume = 0.12
    function play() {
      if (!player || cancelled || !enabled || hasForegroundAudio()) return
      void player.play().catch((error: unknown) => {
        if (cancelled) return
        // Autoplay denial is expected on some browsers; retry within a gesture.
        if (error instanceof DOMException && ['NotAllowedError', 'AbortError'].includes(error.name)) return
        setFailed(true)
      })
    }
    function unlock(event: Event) {
      if (event instanceof KeyboardEvent && !['Enter', ' '].includes(event.key)) return
      if (event.target instanceof Element && event.target.closest('[data-music-toggle]')) return
      if (player?.paused) play()
    }
    if (enabled && !foreground) play()
    else player.pause()
    window.addEventListener('click', unlock)
    window.addEventListener('keydown', unlock)
    return () => {
      cancelled = true
      window.removeEventListener('click', unlock)
      window.removeEventListener('keydown', unlock)
      player.pause()
    }
  }, [enabled, foreground])

  function toggle() {
    const next = !enabled
    setEnabled(next)
    if (!next) audio.current?.pause()
    else if (!hasForegroundAudio()) {
      if (audio.current?.error) audio.current.load()
      // Keep explicit enable within the browser's user-activation event.
      if (audio.current) audio.current.volume = 0.12
      void audio.current?.play().catch(() => {})
    }
  }
  return <div className="background-music-control">
    <audio ref={audio} src={SOURCE} loop preload="auto" onPlaying={() => setFailed(false)} onError={() => setFailed(true)} />
    <button className="motion-toggle" data-music-toggle aria-pressed={enabled} onClick={toggle}
      aria-label="Background music"
      title="Tranquility — Kevin MacLeod. Background music pauses while chapter audio plays.">
      Music {enabled ? 'ON' : 'OFF'}
    </button>
    {failed && <span className="sr-only" role="status">Background music could not load. Check your connection, then turn Music off and on.</span>}
    <a className="music-credit" href={`${import.meta.env.BASE_URL}media/MUSIC-CREDITS.md`} target="_blank" rel="noreferrer" aria-label="Music attribution and license">Music credits</a>
  </div>
}

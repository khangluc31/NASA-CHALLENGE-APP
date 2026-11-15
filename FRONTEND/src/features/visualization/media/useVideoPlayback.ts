import { useEffect, useRef, useState } from 'react'

type MediaState = { status: 'loading' | 'ready' | 'error'; playing: boolean; buffering: boolean }

export function useVideoPlayback(video: HTMLVideoElement | null, source: string, locked: boolean, reduceMotion: boolean) {
  const [media, setMedia] = useState<MediaState>({ status: 'loading', playing: false, buffering: false })
  const [attempt, setAttempt] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const wanted = useRef<boolean | null>(null)
  const previousReduced = useRef(reduceMotion)
  useEffect(() => {
    if (!video) return
    function ready() {
      if (!video || video.videoWidth !== video.videoHeight * 2) { error(); return }
      setMedia(previous => ({ ...previous, status: 'ready' }))
    }
    function error() { setMedia({ status: 'error', playing: false, buffering: false }); video?.pause() }
    function playing() { setMedia(previous => ({ ...previous, playing: true, buffering: false })); setBlocked(false) }
    function paused() { setMedia(previous => ({ ...previous, playing: false, buffering: false })) }
    function waiting() { setMedia(previous => ({ ...previous, buffering: true })) }
    video.addEventListener('loadeddata', ready)
    video.addEventListener('error', error)
    video.addEventListener('playing', playing)
    video.addEventListener('pause', paused)
    video.addEventListener('waiting', waiting)
    video.setAttribute('src', source)
    video.load()
    return () => {
      video.removeEventListener('loadeddata', ready)
      video.removeEventListener('error', error)
      video.removeEventListener('playing', playing)
      video.removeEventListener('pause', paused)
      video.removeEventListener('waiting', waiting)
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
  }, [video, source, attempt])
  useEffect(() => {
    if (!video) return
    if (reduceMotion && !previousReduced.current) wanted.current = false
    previousReduced.current = reduceMotion
    let active = true
    if (locked || media.status !== 'ready' || !(wanted.current ?? !reduceMotion)) video.pause()
    else void video.play().catch(error => {
      if (active && !(error instanceof DOMException && error.name === 'AbortError')) setBlocked(true)
    })
    return () => { active = false; video.pause() }
  }, [video, locked, media.status, reduceMotion])
  // Returning to a hidden browser tab does not start motion without user intent.
  useEffect(() => {
    function visibility() { if (document.hidden) { wanted.current = false; video?.pause() } }
    document.addEventListener('visibilitychange', visibility)
    return () => document.removeEventListener('visibilitychange', visibility)
  }, [video])
  function toggle() {
    if (!video || locked || media.status !== 'ready') return
    wanted.current = video.paused
    if (wanted.current) void video.play().catch(() => setBlocked(true))
    else video.pause()
  }
  return { ...media, blocked, toggle, retry: () => {
    setMedia({ status: 'loading', playing: false, buffering: false }); setBlocked(false); setAttempt(value => value + 1)
  } }
}

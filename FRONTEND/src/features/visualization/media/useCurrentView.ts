import { useCallback, useEffect, useState } from 'react'

export type VideoCurrentView =
  | { status: 'loading' | 'playing' | 'error' }
  | { status: 'paused'; time: number; duration: number }

/** Retain paused readings above disposable viewer slots, opening notes on a new pause. */
export function useCurrentViewState() {
  const [current, setCurrent] = useState<{ view: VideoCurrentView; revision: number }>({ view: { status: 'loading' }, revision: 0 })
  const onChange = useCallback((view: VideoCurrentView) => {
    setCurrent(previous => {
      if (view.status === previous.view.status && (view.status !== 'paused' || (previous.view.status === 'paused' && view.time === previous.view.time && view.duration === previous.view.duration))) return previous
      return { view, revision: previous.revision + (view.status === 'paused' ? 1 : 0) }
    })
  }, [])
  return { ...current, onChange }
}

/** Observe the existing video; publish only playback-state changes, never every frame. */
export function useCurrentView(video: HTMLVideoElement | null, status: 'loading' | 'ready' | 'error', locked: boolean | undefined,
  onChange?: (view: VideoCurrentView) => void) {
  useEffect(() => {
    if (!onChange || locked) return
    if (!video || status !== 'ready') { onChange({ status: status === 'error' ? 'error' : 'loading' }); return }
    return observeCurrentView(video, onChange)
  }, [video, status, locked, onChange])
}

/** Shared with focused lifecycle tests; owns no video or playback clock. */
export function observeCurrentView(video: HTMLVideoElement, onChange: (view: VideoCurrentView) => void): () => void {
  let callback: number | undefined
  let displayedTime: number | undefined
  function trackFrame(_now: number, metadata: VideoFrameCallbackMetadata) {
    displayedTime = metadata.mediaTime
    if (!video.paused) callback = video.requestVideoFrameCallback(trackFrame)
  }
  function cancel() {
    if (callback !== undefined) video.cancelVideoFrameCallback(callback)
    callback = undefined
  }
  function publish() {
    cancel()
    if (!video.paused) {
      onChange({ status: 'playing' })
      if (typeof video.requestVideoFrameCallback === 'function') callback = video.requestVideoFrameCallback(trackFrame)
    } else {
      const time = displayedTime !== undefined && Math.abs(displayedTime - video.currentTime) < 2 / 30 ? displayedTime : video.currentTime
      onChange({ status: 'paused', time, duration: video.duration })
    }
  }
  function seeked() { displayedTime = undefined; publish() }
  video.addEventListener('play', publish)
  video.addEventListener('pause', publish)
  video.addEventListener('seeked', seeked)
  publish()
  return () => {
    cancel()
    video.removeEventListener('play', publish)
    video.removeEventListener('pause', publish)
    video.removeEventListener('seeked', seeked)
  }
}

import { useEffect } from 'react'

export type CarbonDioxideView =
  | { status: 'loading' | 'playing' | 'error' }
  | { status: 'paused'; time: number; duration: number }

/** Observe the existing video; publish only playback-state changes, never every frame. */
export function useCurrentView(video: HTMLVideoElement | null, status: 'loading' | 'ready' | 'error', locked: boolean | undefined,
  onChange?: (view: CarbonDioxideView) => void) {
  useEffect(() => {
    if (!onChange || locked) return
    if (!video || status !== 'ready') { onChange({ status: status === 'error' ? 'error' : 'loading' }); return }
    return observeCurrentView(video, onChange)
  }, [video, status, locked, onChange])
}

/** Shared with focused lifecycle tests; owns no video or playback clock. */
export function observeCurrentView(video: HTMLVideoElement, onChange: (view: CarbonDioxideView) => void): () => void {
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

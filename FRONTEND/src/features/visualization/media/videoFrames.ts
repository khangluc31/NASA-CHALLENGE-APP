/** Imperative frame subscription: no per-frame React or shared-state updates. */
export function observeVideoFrames(video: HTMLVideoElement, draw: () => void): () => void {
  let stopped = false
  let videoFrame: number | undefined
  let animationFrame: number | undefined
  function cancel() {
    if (videoFrame !== undefined) video.cancelVideoFrameCallback(videoFrame)
    if (animationFrame !== undefined) cancelAnimationFrame(animationFrame)
    videoFrame = undefined
    animationFrame = undefined
  }
  function frame() {
    cancel()
    if (stopped) return
    if (video.readyState >= 2) draw()
    if (!video.paused && !video.ended) {
      if (typeof video.requestVideoFrameCallback === 'function') videoFrame = video.requestVideoFrameCallback(frame)
      else animationFrame = requestAnimationFrame(frame)
    }
  }
  const events = ['loadeddata', 'play', 'pause', 'seeked'] as const
  events.forEach(event => video.addEventListener(event, frame))
  frame()
  return () => { stopped = true; cancel(); events.forEach(event => video.removeEventListener(event, frame)) }
}

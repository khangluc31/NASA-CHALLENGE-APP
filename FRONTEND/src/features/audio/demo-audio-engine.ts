export const DEMO_SOURCE = `${import.meta.env?.BASE_URL ?? '/'}media/atlas-demo.wav`
export const DEMO_CREDIT = `${import.meta.env?.BASE_URL ?? '/'}media/AUDIO-CREDITS.md`
export const DEMO_LABEL = 'Atlas chimes · 10 s · Local demo'

/** Temporary clip player, deliberately independent of scientific data mapping. */
export class DemoAudioEngine {
  private context: AudioContext | null = null
  private gain: GainNode | null = null
  analyser: AnalyserNode | null = null
  private buffer: AudioBuffer | null = null
  private source: AudioBufferSourceNode | null = null
  private offset = 0
  private startedAt = 0
  private volume = 0.3
  private request = 0
  private disposed = false
  private abort = new AbortController()
  private onEnded: () => void
  label = DEMO_LABEL

  constructor(onEnded: () => void) { this.onEnded = onEnded }
  get duration() { return this.buffer?.duration ?? 0 }
  get playing() { return this.source !== null }
  get position() { return this.source && this.context ? Math.min(this.duration, this.offset + this.context.currentTime - this.startedAt) : this.offset }

  private async load(url: string, context: AudioContext) {
    const signal = this.abort.signal
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error('Audio could not be downloaded')
    return context.decodeAudioData(await response.arrayBuffer())
  }

  async play() {
    const request = ++this.request
    if (this.disposed) return
    if (!this.context) {
      this.context = new AudioContext()
      this.gain = this.context.createGain()
      this.gain.gain.value = this.volume
      this.analyser = this.context.createAnalyser()
      this.analyser.fftSize = 2048
      this.analyser.smoothingTimeConstant = 0.18
      this.analyser.minDecibels = -85
      this.analyser.maxDecibels = -20
      this.gain.connect(this.analyser)
      this.analyser.connect(this.context.destination)
    }
    const context = this.context
    await context.resume() // Called directly from the user's Play gesture.
    if (this.disposed || request !== this.request) return
    if (!this.buffer) {
      this.buffer = await this.load(DEMO_SOURCE, context)
    }
    if (this.disposed || request !== this.request || !this.gain) return
    if (this.offset >= this.duration) this.offset = 0
    const source = context.createBufferSource()
    source.buffer = this.buffer
    source.connect(this.gain)
    source.onended = () => {
      if (this.source !== source) return
      source.disconnect()
      this.source = null
      this.offset = this.duration
      this.onEnded()
    }
    this.source = source
    this.startedAt = context.currentTime
    this.gain.gain.setTargetAtTime(this.volume, context.currentTime, 0.015)
    source.start(0, this.offset)
  }

  pause() {
    ++this.request
    this.offset = this.position
    this.releaseSource()
  }
  stop() { this.pause(); this.offset = 0 }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value))
    if (this.context && this.gain) this.gain.gain.setTargetAtTime(this.volume, this.context.currentTime, 0.015)
  }
  private releaseSource() {
    if (!this.source) return
    this.source.onended = null
    this.source.stop()
    this.source.disconnect()
    this.source = null
  }
  dispose() {
    this.disposed = true
    ++this.request
    this.abort.abort()
    const context = this.context
    const source = this.source
    this.source = null
    if (source) source.onended = null
    if (context && this.gain && context.state !== 'closed') {
      this.gain.gain.cancelScheduledValues(context.currentTime)
      this.gain.gain.setTargetAtTime(0, context.currentTime, 0.008)
      source?.stop(context.currentTime + 0.04)
      // Allow the short fade to reach the device before closing its context.
      window.setTimeout(() => { source?.disconnect(); void context.close().catch(() => {}) }, 50)
    }
  }
}

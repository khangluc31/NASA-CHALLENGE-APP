import { AudioEngine } from '../../../audio/engine'
import type { Features } from '../../../audio/types'

/** Adapts the supplied synthesizer to the compact book player's existing interface. */
export class ChapterAudioEngine {
  private synth = new AudioEngine()
  private off: () => void
  private disposed = false
  private progress = 0
  private volume = 0.3
  readonly label: string
  constructor(features: Features, label: string, onEnded: () => void) {
    this.label = label
    this.synth.load(features)
    this.off = this.synth.onPlayhead((_col, progress) => { this.progress = progress * this.duration })
    this.onEnded = onEnded
  }
  private onEnded: () => void
  get duration() { return this.synth.sweepSeconds1x }
  get position() { return this.progress }
  get playing() { return !this.disposed && this.synth.playing }
  private poll: ReturnType<typeof setInterval> | undefined
  async play() {
    if (this.disposed) return
    await this.synth.play()
    if (this.disposed) return
    this.synth.setVolume(this.volume)
    clearInterval(this.poll)
    this.poll = setInterval(() => {
      if (!this.synth.playing) { clearInterval(this.poll); this.progress = this.duration; this.onEnded() }
    }, 100)
  }
  pause() { clearInterval(this.poll); this.synth.pause() }
  stop() { clearInterval(this.poll); this.synth.stop(); this.progress = 0 }
  setVolume(value: number) { this.volume = value; this.synth.setVolume(value) }
  dispose() { this.disposed = true; clearInterval(this.poll); this.off(); this.synth.dispose() }
  get analyser() {
    const analysis = this.synth.readAnalysis()
    if (!analysis) return null
    return { frequencyBinCount: 1024, fftSize: 2048, context: { sampleRate: analysis.sampleRate },
      getByteFrequencyData: (target: Uint8Array) => {
        const current = this.synth.readAnalysis()
        target.fill(0)
        if (current) current.fft.forEach((value, index) => { if (index < target.length) target[index] = Math.max(0, Math.min(255, (value + 100) / 80 * 255)) })
      },
      getByteTimeDomainData: (target: Uint8Array) => {
        const current = this.synth.readAnalysis()
        target.fill(128)
        if (current) current.waveform.forEach((value, index) => { if (index < target.length) target[index] = Math.max(0, Math.min(255, (value + 1) * 128)) })
      },
    }
  }
}

import { claimForegroundAudio } from './audio-priority'
import { useContext, useEffect, useRef, useState } from 'react'
import { MotionConfigContext, useReducedMotion } from 'motion/react'
import { AudioLines, Pause, Play, Square, Volume2, VolumeX } from 'lucide-react'
import type { ChapterAudioEngine } from './chapter-audio-engine'
import { DEMO_LABEL, DemoAudioEngine } from './demo-audio-engine'

function clock(seconds: number) { return `00:${String(Math.floor(seconds)).padStart(2, '0')}` }

const makeDemoPlayer = (onEnded: () => void) => new DemoAudioEngine(onEnded)
export function DemoSonification({ disabled = false }: { disabled?: boolean }) {
  return <SonificationPlayer disabled={disabled} createPlayer={makeDemoPlayer} sourceLabel={DEMO_LABEL} description="Demo audio / Not NASA data sonification" />
}

export function SonificationPlayer({ disabled = false, createPlayer, sourceLabel, description, initialVolume = 0.3, initialMuted = false, onVolumeChange, onMuteChange }: {
  disabled?: boolean
  createPlayer: (onEnded: () => void) => DemoAudioEngine | ChapterAudioEngine
  sourceLabel: string
  description: string
  initialVolume?: number
  initialMuted?: boolean
  onVolumeChange?: (value: number) => void
  onMuteChange?: (value: boolean) => void
}) {
  const engine = useRef<DemoAudioEngine | ChapterAudioEngine | null>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const intent = useRef(0)
  const [status, setStatus] = useState<'ready' | 'loading' | 'playing' | 'paused' | 'error'>('ready')
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(initialVolume)
  const [muted, setMuted] = useState(initialMuted)
  const [label, setLabel] = useState(sourceLabel)
  const systemReduced = useReducedMotion()
  const config = useContext(MotionConfigContext)
  const reduced = systemReduced || config.reducedMotion === 'always'

  useEffect(() => {
    if (disabled) return
    const player = createPlayer(() => { setStatus('ready'); setProgress(player.duration) })
    engine.current = player
    return () => { player.dispose(); engine.current = null }
  }, [disabled, createPlayer])
  useEffect(() => { engine.current?.setVolume(muted ? 0 : volume) }, [muted, volume, disabled, createPlayer])

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const analyser = engine.current?.analyser
    const spectrum = new Uint8Array(analyser?.frequencyBinCount ?? 1024)
    const waveform = new Uint8Array(analyser?.fftSize ?? 2048)
    const bandCount = 48
    const levels = new Float32Array(bandCount)
    let frame = 0, lastProgress = 0, lastFrame = 0
    function draw(now: number) {
      if (!context || !element) return
      const player = engine.current
      const currentAnalyser = player?.analyser
      const active = status === 'playing' && !reduced && !muted && volume > 0 && currentAnalyser
      const width = element.width, height = element.height
      const center = height / 2
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrame) / 1000 || 1 / 60))
      lastFrame = now
      spectrum.fill(0)
      waveform.fill(128)
      if (active) {
        currentAnalyser.getByteFrequencyData(spectrum)
        currentAnalyser.getByteTimeDomainData(waveform)
      }
      let energy = 0
      for (const value of waveform) energy += ((value - 128) / 128) ** 2
      const pulse = Math.min(1, Math.sqrt(energy / waveform.length) * 5)
      const sampleRate = currentAnalyser?.context.sampleRate ?? 44100
      const binHz = sampleRate / (currentAnalyser?.fftSize ?? 2048)
      const upperHz = Math.min(12000, sampleRate / 2)
      for (let band = 0; band < bandCount; band++) {
        // Logarithmic bands: bass in the middle, treble toward both ends.
        const from = Math.max(1, Math.floor(40 * (upperHz / 40) ** (band / bandCount) / binHz))
        const to = Math.min(spectrum.length - 1, Math.max(from, Math.ceil(40 * (upperHz / 40) ** ((band + 1) / bandCount) / binHz)))
        let peak = 0
        for (let bin = from; bin <= to; bin++) peak = Math.max(peak, spectrum[bin])
        // RMS gates quiet/silent output and preserves audible volume changes.
        const target = active ? (peak / 255) ** 1.5 * Math.min(1, pulse * 2.5) : 0
        // Fast attack and time-based release make transients snap, not wobble.
        const rate = target > levels[band] ? 75 : 9
        levels[band] += (target - levels[band]) * (1 - Math.exp(-rate * dt))
      }
      context.clearRect(0, 0, width, height)
      const gradient = context.createLinearGradient(0, 0, width, 0)
      gradient.addColorStop(0, '#ffffff')
      gradient.addColorStop(0.5, '#ffffff')
      gradient.addColorStop(1, '#ffffff')
      context.strokeStyle = gradient
      context.lineCap = 'round'
      const count = bandCount * 2
      const step = width / count
      context.lineWidth = step * 0.36
      // Separate rounded bars, symmetric above/below the horizontal axis.
      // The idle state is a dotted line; no synthetic oscillation is added.
      for (let index = 0; index < count; index++) {
        const band = index < bandCount ? bandCount - 1 - index : index - bandCount
        const amplitude = Math.max(1, levels[band] * height * 0.43)
        const x = (index + 0.5) * step
        context.beginPath()
        context.moveTo(x, center - amplitude)
        context.lineTo(x, center + amplitude)
        context.stroke()
      }
      if (status === 'playing') {
        if (now - lastProgress > 100) { setProgress(player?.position ?? 0); lastProgress = now }
        frame = requestAnimationFrame(draw)
      }
    }
    draw(0)
    return () => cancelAnimationFrame(frame)
  }, [status, reduced, muted, volume])

  useEffect(() => {
    if (!disabled && (status === 'loading' || status === 'playing')) return claimForegroundAudio()
  }, [disabled, status])

  async function toggle() {
    const player = engine.current
    if (!player) return
    if (status === 'playing') { player.pause(); setProgress(player.position); setStatus('paused'); return }
    const token = ++intent.current
    setStatus('loading')
    try {
      await player.play()
      if (token !== intent.current || engine.current !== player) return
      setDuration(player.duration); setLabel(player.label)
      setStatus(player.playing ? 'playing' : 'ready')
    } catch { if (token === intent.current && engine.current === player) setStatus('error') }
  }
  function stop() { ++intent.current; engine.current?.stop(); setProgress(0); setStatus('ready') }

  return <section className="demo-audio" aria-label="Sonification player">
    <div className="flex items-center justify-between gap-2"><span className="eyebrow">SONIFICATION</span><AudioLines size={16} aria-hidden="true" /></div>
    <canvas ref={canvas} className="demo-waveform" width={900} height={100} aria-label={reduced ? 'Wave animation disabled by reduced motion' : 'Audio-reactive horizontal spectrum, mirrored above and below the center line'} role="img" />
    <progress className="audio-progress" value={progress} max={duration || 1} aria-label="Audio playback progress" />
    <div className="demo-audio-controls">
      <span className="audio-time">{clock(progress)} / {duration ? clock(duration) : '—'}</span>
      <button onClick={() => void toggle()} disabled={disabled || status === 'loading'}>{status === 'playing' ? <Pause size={16} /> : <Play size={16} />}{status === 'loading' ? 'Loading…' : status === 'playing' ? 'Pause' : status === 'error' ? 'Retry' : 'Play'}</button>
      <button disabled={disabled} onClick={stop} aria-label="Stop audio and return to start"><Square size={14} /> Stop</button>
      <button disabled={disabled} onClick={() => { setMuted(!muted); onMuteChange?.(!muted) }} aria-label={muted ? 'Unmute audio' : 'Mute audio'} aria-pressed={muted}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
      <input disabled={disabled} aria-label="Audio volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={event => { const value = Number(event.target.value); setVolume(value); onVolumeChange?.(value) }} />
    </div>
    <p className="demo-audio-status" role="status">{status === 'error' ? 'Could not play sound. Press Retry.' : status === 'loading' ? 'Preparing sound…' : `${disabled || status === 'ready' ? sourceLabel : label}${reduced ? ' · Wave animation off' : ''}`}</p>
    <p className="audio-disclaimer">{description}</p>
  </section>
}

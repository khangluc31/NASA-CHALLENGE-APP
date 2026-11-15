import { useEffect, useState } from 'react'
import { Pause, Play, Square, Volume2, VolumeX } from 'lucide-react'
import { claimForegroundAudio } from './audio-priority'
// DataSonification nằm cùng folder với DemoSonification cũ, nên engine vẫn là '../../../audio' như cũ.
// audio-lab/ là anh em cùng cấp với folder audio/ này (giống AudioLabPage import '../../../audio').
import { engine } from '../../../audio'
import { FeatureGrid } from '../audio-lab/components/FeatureGrid'
import { bindEngineToStore, useJukeboxStore } from '../audio-lab/store'
import { DATASETS, type DatasetDoc, type DatasetId } from './dataset-docs'

type PlayState = 'stopped' | 'playing' | 'paused'

const effectiveVolume = (volume: number, muted: boolean) => (muted ? 0 : volume)

interface DataSonificationProps {
  disabled?: boolean
  /**
   * Khoá vào đúng một dataset (dùng trong sách: mỗi chương một dataset).
   * Bỏ trống -> hiện 3 nút cho người dùng tự chọn (dùng ở AudioLabPage / demo độc lập).
   */
  datasetId?: DatasetId
  /**
   * Năm do phần hình phía trên điều khiển (chỉ Night Lights). Kéo năm trên -> audio nhảy tới năm đó.
   * Bỏ trống -> audio độc lập (CO2, Ocean). Khi có, ô chọn năm nội bộ bị ẩn.
   */
  syncYear?: number
}

const docFor = (id: DatasetId | undefined): DatasetDoc =>
  (id && DATASETS.find((d) => d.id === id)) || DATASETS[0]

/** Replaces DemoSonification: same section, but plays the real datasets and shows the feature grid + docs. */
export function DataSonification({ disabled = false, datasetId, syncYear }: DataSonificationProps) {
  const locked = datasetId !== undefined // sách truyền datasetId -> không cho đổi dataset
  const [doc, setDoc] = useState<DatasetDoc>(() => docFor(datasetId))
  const [playState, setPlayState] = useState<PlayState>('stopped')
  const [position, setPosition] = useState({ total: 0, col: 0 })
  const [volume, setVolume] = useState(0.3)
  const [muted, setMuted] = useState(false)
  const [audioError, setAudioError] = useState(false)

  const loadStatus = useJukeboxStore((s) => s.loadStatus)
  const loadError = useJukeboxStore((s) => s.loadError)
  const years = useJukeboxStore((s) => s.years)
  const yearIndex = useJukeboxStore((s) => s.yearIndex)
  const colCount = useJukeboxStore((s) => s.features?.columns.length ?? 0)
  const rowCount = useJukeboxStore((s) => s.features?.columns[0]?.rows.length ?? 0)

  // Keep the engine callbacks wired to the store while mounted; stop sound when leaving.
  useEffect(() => {
    if (disabled) return
    const unbind = bindEngineToStore()
    const offPlayhead = engine.onPlayhead((col, progress, info) => {
      const total = info?.total ?? progress
      setPosition({ total, col })
      // Also follows Space pressed on the grid, which starts playback without going through our button.
      if (engine.playing) setPlayState('playing')
      else if (col === 0 && total === 0) setPlayState('stopped')
    })
    return () => {
      unbind()
      offPlayhead()
      engine.stop()
    }
  }, [disabled])

  // Chương đổi -> đổi doc theo datasetId (giữ đồng bộ khi EarthBook tái dùng cùng instance).
  useEffect(() => {
    if (datasetId === undefined) return
    setDoc(docFor(datasetId))
    setPlayState('stopped')
    setPosition({ total: 0, col: 0 })
  }, [datasetId])

  // Load the chosen dataset (also the first one on mount). Loading stops playback inside engine.load().
  useEffect(() => {
    if (disabled) return
    void useJukeboxStore.getState().selectDataset(doc.url)
  }, [disabled, doc.url])

  // Đồng bộ năm từ phần hình (Night Lights): kéo năm trên -> chọn đúng frame năm đó ở audio.
  useEffect(() => {
    if (disabled || syncYear === undefined || years.length === 0) return
    const target = Math.round(syncYear)
    const match = years.find((y) => y.year === target)
    if (match && match.index !== yearIndex) useJukeboxStore.getState().selectYear(match.index)
  }, [disabled, syncYear, years, yearIndex])

  useEffect(() => {
    if (!disabled && playState === 'playing') return claimForegroundAudio()
  }, [disabled, playState])

  async function toggle() {
    if (playState === 'playing') {
      engine.pause()
      setPlayState('paused')
      return
    }
    setAudioError(false)
    try {
      engine.setVolume(effectiveVolume(volume, muted))
      await engine.play()
      setPlayState('playing')
    } catch {
      setAudioError(true)
    }
  }
  function stop() {
    engine.stop()
    setPlayState('stopped')
  }
  function changeVolume(value: number) {
    setVolume(value)
    engine.setVolume(effectiveVolume(value, muted))
  }
  function toggleMute() {
    const next = !muted
    setMuted(next)
    engine.setVolume(effectiveVolume(volume, next))
  }

  const hasGrid = colCount > 0
  const loading = loadStatus === 'loading'
  const percent = Math.round(position.total * 100)

  return <section className="demo-audio" aria-label="Data sonification player">
    <FeatureGrid bare />

    {/* Ô chọn năm chỉ hiện khi KHÔNG đồng bộ với phần hình (ví dụ dùng ở AudioLabPage). */}
    {!locked && syncYear === undefined && years.length > 1 && (
      <div className="demo-audio-controls">
        <select
          disabled={disabled}
          value={yearIndex}
          aria-label="Choose year"
          onChange={(event) => useJukeboxStore.getState().selectYear(Number(event.target.value))}
        >
          {years.map(({ index, year }) => <option key={index} value={index}>{year ?? `Part ${index + 1}`}</option>)}
        </select>
      </div>
    )}

    <progress className="audio-progress" value={position.total} max={1} aria-label="Playback position" />
    <div className="demo-audio-controls">
      <span className="audio-time">{hasGrid ? `Column ${Math.min(position.col + 1, colCount)} / ${colCount} · ${percent}%` : '—'}</span>
      <button onClick={() => void toggle()} disabled={disabled || !hasGrid}>{playState === 'playing' ? <Pause size={16} /> : <Play size={16} />}{playState === 'playing' ? 'Pause' : audioError ? 'Retry' : 'Play'}</button>
      <button disabled={disabled} onClick={stop} aria-label="Stop audio and return to start"><Square size={14} /> Stop</button>
      <button disabled={disabled} onClick={toggleMute} aria-label={muted ? 'Unmute audio' : 'Mute audio'} aria-pressed={muted}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
      <input disabled={disabled} aria-label="Audio volume" type="range" min="0" max="1" step="0.01" value={volume} onChange={(event) => changeVolume(Number(event.target.value))} />
    </div>
    <p className="demo-audio-status" role="status">
      {loadStatus === 'error'
        ? <>Could not load {doc.label}: {loadError} <button type="button" onClick={() => void useJukeboxStore.getState().selectDataset(doc.url)}>Retry</button></>
        : audioError ? 'Could not start audio. Press Retry.'
        : loading ? `Loading ${doc.label}…`
        : hasGrid ? `${doc.label} · ${colCount} columns × ${rowCount} rows` : ''}
    </p>
  </section>
}

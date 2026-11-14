import { AudioLines, Globe2, Image, Map, Play, Square, Volume2 } from 'lucide-react'
import type { BookChapter } from '../types'
import { EarthArtwork } from './EarthArtwork'

export function VisualizationPreview({ chapter, loading = false }: { chapter: BookChapter; loading?: boolean }) {
  const Icon = chapter.viewer === 'globe' ? Globe2 : chapter.viewer === 'map' ? Map : Image
  return <div className="viewer-preview">
    <div className="viewer-label"><Icon size={14} /><span>{chapter.category}</span><span className="preview-badge">PREVIEW</span></div>
    {chapter.previewUrl ? <EarthArtwork src={chapter.previewUrl} /> : <div className="viewer-empty"><Icon strokeWidth={0.6} /><span>{chapter.viewer === 'media' ? 'Visual story' : chapter.viewer === 'map' ? 'Map exploration' : 'Earth exploration'}</span><p>Reference {chapter.viewer} view · Scientific layers pending.</p></div>}
    <div className="viewer-caption">{loading ? 'Preparing the next chapter…' : 'Static preview · Reference viewer activates when the book is ready'}</div>
  </div>
}
export function AudioPlaceholder() {
  return <section className="audio-placeholder" aria-label="Sonification placeholder">
    <div className="flex items-center justify-between gap-2"><span className="eyebrow">SONIFICATION / NOT CONNECTED</span><AudioLines size={16} /></div>
    <svg className="audio-line" viewBox="0 0 500 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 22 Q30 30 65 22 T130 20 T195 24 T260 19 T325 22 T390 24 T455 20 T500 22" /><path d="M0 24 Q35 19 70 24 T140 23 T210 20 T280 24 T350 20 T420 23 T500 21" /></svg>
    <div className="audio-controls flex items-center justify-between gap-3"><span>00:00 / —</span><div className="flex gap-5"><button disabled title="Connect the audio engine to enable playback"><Play size={16} /> Play</button><button disabled><Square size={14} /> Stop</button></div><Volume2 size={17} aria-hidden="true" /></div>
    <p className="audio-disclaimer">Illustrative waveform · No audio data connected</p>
  </section>
}

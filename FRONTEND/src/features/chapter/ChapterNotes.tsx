import { useState } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { BookChapter } from '../book/types'

const SECTIONS = ['Overview', 'Observations', 'Sound mapping'] as const
export function ChapterNotes({ chapter, number }: { chapter: BookChapter; number: string }) {
  const [section, setSection] = useState<(typeof SECTIONS)[number]>('Overview')
  return <div className="notes-content">
    <p className="eyebrow">OBSERVATION NOTES / {number}</p>
    <h2>{chapter.title}</h2>
    <div className="notes-tabs flex gap-5" role="group" aria-label="Chapter sections">{SECTIONS.map(item => <button key={item} aria-pressed={section === item} onClick={() => setSection(item)}>{item}</button>)}</div>
    <div className="notes-body" tabIndex={0} role="region" aria-label={`${section} notes`}>
      <span className="draft-label">DRAFT CHAPTER / SAMPLE CONTENT</span>
      {section === 'Overview' ? <>
        <section><h3>Overview</h3><p>{chapter.introduction}</p></section>
        <section><h3>Explore a {chapter.viewer === 'media' ? 'frame' : 'location'}</h3><p>Select a point in the viewer to see its coordinates in the visualization corner. The background provides geographic context; scientific layers and audio are not connected yet.</p></section>
        <section className="notes-divider"><h3>Reading the visualization</h3><p>The final color scale, units, and audio mapping will follow the verified source dataset. This preview does not represent live observations.</p></section>
      </> : section === 'Observations' ? <>
        <section><h3>About the observations</h3><p>This chapter’s scientific layer and measurement dataset are not connected yet. Selecting a coordinate does not provide a measurement.</p></section>
        <dl className="observation-fields">{['Observation time', 'Variable', 'Value / unit'].map(label => <div key={label}><dt>{label}</dt><dd>Not available</dd></div>)}</dl>
        <p className="small-note">Missing values stay unavailable; they are never interpreted as zero.</p>
      </> : <>
        <section><h3>From observation to sound</h3><p>The Sound team will document which data feature controls pitch, rhythm, volume, or timbre. No sound mapping has been connected to this chapter yet.</p></section>
        <section className="notes-divider"><h3>Listen at your own pace</h3><p>Audio will start only when you press Play. Changing chapters stops playback; the new chapter will never play automatically.</p></section>
      </>}
    </div>
    <footer className="notes-source">{chapter.sourceUrl ? <a href={chapter.sourceUrl} target="_blank" rel="noreferrer">CHAPTER SOURCE <ArrowUpRight size={14} /></a> : <span>CHAPTER SOURCE / Awaiting verified dataset</span>}</footer>
  </div>
}

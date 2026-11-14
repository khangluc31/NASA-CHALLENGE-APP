import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { BookChapter } from '../book/types'

const SECTIONS = ['Overview', 'Observations', 'Sound mapping'] as const
export function ChapterNotes({ chapter, number, selectedArea, selectionKey }: {
  chapter: BookChapter; number: string; selectedArea?: ReactNode; selectionKey?: string | null
}) {
  const [choice, setChoice] = useState<{ section: string; selectionKey?: string | null }>({ section: 'Overview' })
  // A new deliberate selection opens the inspector; year changes do not interrupt reading.
  const section = selectionKey !== choice.selectionKey ? selectedArea ? 'Selected area' : 'Overview'
    : choice.section === 'Selected area' && !selectedArea ? 'Overview' : choice.section
  const sections = selectedArea ? [...SECTIONS, 'Selected area'] : SECTIONS
  return <div className="notes-content">
    <p className="eyebrow">OBSERVATION NOTES / {number}</p>
    <h2>{chapter.title}</h2>
    <div className="notes-tabs flex flex-wrap gap-5" role="group" aria-label="Chapter sections">{sections.map(item => <button key={item} aria-pressed={section === item} onClick={() => setChoice({ section: item, selectionKey })}>{item}</button>)}</div>
    <div key={section} className="notes-body" tabIndex={0} role="region" aria-label={`${section} notes`}>
      {section !== 'Selected area' && <span className="draft-label">DRAFT CHAPTER / SAMPLE CONTENT</span>}
      {section === 'Selected area' ? selectedArea : section === 'Overview' ? <>
        <section><h3>Overview</h3><p>{chapter.id === 'night-lights' ? 'Explore NASA’s annual night-light imagery from 2012 to 2023. Move the year slider to compare the patterns, then select a location to inspect the extracted brightness history for its surrounding grid area.' : chapter.introduction}</p></section>
        <section><h3>Explore a {chapter.viewer === 'media' ? 'frame' : 'location'}</h3><p>{chapter.id === 'night-lights' ? 'Selecting a location opens Selected area with annual brightness, change since 2012 and a twelve-year trend. The values describe a 2° × 2° area, not the exact pin. The independent audio demo is not linked to these values.' : 'Select a point in the viewer to see its coordinates in the visualization corner. The background provides geographic context; scientific layers are not connected yet. Press Play to test the independent demo clip. It does not represent measurements.'}</p></section>
        <section className="notes-divider"><h3>Reading the visualization</h3><p>{chapter.id === 'night-lights' ? 'The detailed imagery and the coarse extracted brightness grid are separate sources of visual and numerical information. Brightness uses a fixed 0–1 scale with no physical radiance unit. Between years, the map blends annual images while the inspector uses the nearest actual year.' : 'The final color scale, units, and audio mapping will follow the verified source dataset. This preview does not represent live observations.'}</p></section>
        <section className="notes-divider"><h3>A guide to this chapter</h3><p>This extended reading section is sample editorial content for testing the book layout. Scroll within this page to continue reading while keeping the visualization on the left in view. The final version will replace these notes with a narrative reviewed against the selected resource.</p></section>
        <section><h3>Start with the big picture</h3><p>Before exploring a particular place or time, the chapter will introduce the visualization as a whole. The accompanying explanation should identify what is being shown, whether it comes from observations or a model, and which visual features are meaningful. Colors, movement, and brightness need an explicit legend rather than an assumed interpretation.</p></section>
        <section><h3>Look closely, then compare</h3><p>A useful exploration starts with one selection and then compares it with another. The finished inspector will keep the variable, unit, location, and time together so that the reader can understand what has changed. Comparing two samples will only be appropriate when their definitions and scales are compatible. This sample page deliberately contains no invented values.</p></section>
        <section><h3>Listen with a question in mind</h3><p>When the real sonification is connected, the reader should be able to explain what a higher note or a faster rhythm means. The sound mapping will therefore be documented beside the visualization. For this interface test, all three chapters use the same independent demo clip. Its waveform shows the sound being played; it does not show atmospheric, ocean, or lighting measurements.</p></section>
        <section><h3>Understand the limits</h3><p>Every resource has a particular coverage, time reference, and processing history. Missing samples should stay visibly unavailable, and modeled quantities should be distinguished from direct observations. These details will help the audience avoid drawing conclusions that the source cannot support. Source-specific limitations remain to be filled in by the Data team.</p></section>
        <section><h3>Explore at your own pace</h3><p>Pause or stop the demo at any time, adjust its volume, or mute it while reading. Scrolling these notes does not change the selected chapter. Turning to another chapter stops the current sound; the next chapter waits for you to press Play. A textual explanation will remain available even when audio is turned off.</p></section>
        <section className="notes-divider"><h3>End of sample reading</h3><p>You have reached the end of the long-content scrollbar test for {chapter.shortTitle}. The heading and section controls remain above the scrolling area, while the source note stays below it. Replace this sample text with the verified chapter narrative when it is ready.</p></section>
      </> : section === 'Observations' ? <>
        <section><h3>About the observations</h3><p>{chapter.id === 'night-lights' ? 'The extracted annual grid covers 2012–2023. Select a map location to open its regional brightness history. Zero is a covered dark sample; unavailable cells have no sample. Comparisons require full coverage in both years.' : 'This chapter’s scientific layer and measurement dataset are not connected yet. Selecting a coordinate does not provide a measurement.'}</p></section>
        {chapter.id !== 'night-lights' && <dl className="observation-fields">{['Observation time', 'Variable', 'Value / unit'].map(label => <div key={label}><dt>{label}</dt><dd>Not available</dd></div>)}</dl>}
        <p className="small-note">Missing values stay unavailable; they are never interpreted as zero.</p>
      </> : <>
        <section><h3>From observation to sound</h3><p>The Sound team will document which data feature controls pitch, rhythm, volume, or timbre. A short independent demo clip is available in the player. Its waveform is computed from the actual audio output; scientific data-to-sound mapping is not connected yet.</p></section>
        <section className="notes-divider"><h3>Listen at your own pace</h3><p>Audio will start only when you press Play. Changing chapters stops playback; the new chapter will never play automatically.</p></section>
      </>}
    </div>
    <footer className="notes-source">{chapter.sourceUrl ? <a href={chapter.sourceUrl} target="_blank" rel="noreferrer">CHAPTER SOURCE <ArrowUpRight size={14} /></a> : <span>CHAPTER SOURCE / Awaiting verified dataset</span>}</footer>
  </div>
}

import { useState } from 'react'
import type { ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import type { BookChapter } from '../book/types'
import { observationsContent, overviewContent, soundMappingContent } from './readingContent'

function ReadingContent({ text }: { text: string }) {
  return <div className="chapter-reading">{text.split(/\n\n/).map((block, index) => {
    if (block.startsWith('* ')) return <ul key={index}>{block.split('\n').map(item => <li key={item}>{item.slice(2)}</li>)}</ul>
    return block.split('\n').map((line, lineIndex) => {
      const key = `${index}-${lineIndex}`
      if (line.startsWith('## ')) return <h4 key={key}>{line.slice(3)}</h4>
      if (line.startsWith('# ')) return <h3 key={key}>{line.slice(2)}</h3>
      return <p key={key}>{line}</p>
    })
  })}</div>
}

const SECTIONS = ['Overview', 'Observations', 'Sound mapping'] as const
export function ChapterNotes({ chapter, number, selectedArea, selectionKey, selectedAreaLabel = 'Selected area' }: {
  chapter: BookChapter; number: string; selectedArea?: ReactNode; selectionKey?: string | null; selectedAreaLabel?: string
}) {
  const [choice, setChoice] = useState<{ section: string; selectionKey?: string | null }>({ section: 'Overview' })
  // A new deliberate selection opens the inspector; year changes do not interrupt reading.
  const section = selectionKey != null && selectionKey !== choice.selectionKey ? selectedArea ? selectedAreaLabel : 'Overview'
    : choice.section === selectedAreaLabel && !selectedArea ? 'Overview' : choice.section
  const chapterSections = SECTIONS.filter(item => item !== 'Observations' || observationsContent[chapter.id])
  const sections = selectedArea ? [...chapterSections, selectedAreaLabel] : chapterSections
  return <div className={`notes-content${chapter.id === 'audio-lab' ? '' : ' science-notes'}`}>
    <p className="eyebrow">{chapter.id === 'audio-lab' ? 'CHAPTER NOTES' : 'Chapter notes'} / {number}</p>
    <h2>{{ 'carbon-dioxide': 'DYAMOND global carbon dioxide', 'ocean-temperature': 'Global sea surface currents and temperature', 'night-lights': 'Change in night lights between 2012 and 2023' }[chapter.id] ?? chapter.title}</h2>
    <div className="notes-tabs flex flex-wrap gap-5" role="group" aria-label="Chapter sections">{sections.map(item => <button key={item} aria-pressed={section === item} onClick={() => setChoice({ section: item, selectionKey })}>{item}</button>)}</div>
    <div key={section} className="notes-body" tabIndex={0} role="region" aria-label={`${section} notes`}>
      {section === selectedAreaLabel ? selectedArea : <ReadingContent text={section === 'Overview'
        ? overviewContent[chapter.id] ?? chapter.introduction
        : section === 'Observations' ? observationsContent[chapter.id] ?? '' : soundMappingContent[chapter.id] ?? chapter.introduction} />}
    </div>
    <footer className="notes-source">{chapter.sourceUrl ? <a href={chapter.sourceUrl} target="_blank" rel="noreferrer">{chapter.id === 'audio-lab' ? 'CHAPTER SOURCE' : 'Chapter source'} <ArrowUpRight size={14} /></a> : <span>{chapter.id === 'audio-lab' ? 'CHAPTER SOURCE' : 'Chapter source'} / Awaiting verified dataset</span>}</footer>
  </div>
}

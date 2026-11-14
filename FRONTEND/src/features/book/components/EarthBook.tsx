import { useContext, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { motion, MotionConfigContext, useReducedMotion } from 'motion/react'
import { ArrowLeft, ArrowRight, BookOpen, RotateCcw, X } from 'lucide-react'
import { PageSnapshot } from './PageSnapshot'
import { capturePage } from '../capture-page'
import { BOOK_CHAPTERS } from '../chapters'
import type { EarthBookProps } from '../types'
import { useBookNavigation } from '../hooks/useBookNavigation'
import { ChapterNotes } from '../../chapter/ChapterNotes'
import { AudioPlaceholder, VisualizationPreview } from './BookPlaceholders'

export function EarthBook(props: EarthBookProps) {
  const chapters = props.chapters ?? BOOK_CHAPTERS
  if (chapters.length === 0) return <main id="main-content" className="empty-book"><h1>No chapters yet</h1><p>Add a chapter to open the atlas.</p><button onClick={props.onClose}>Return to cover</button></main>
  return <BookWithChapters {...props} chapters={chapters} />
}
const subscribeViewport = (callback: () => void) => {
  const media = window.matchMedia('(max-width: 900px)')
  media.addEventListener('change', callback)
  return () => media.removeEventListener('change', callback)
}
const isSmallViewport = () => window.matchMedia('(max-width: 900px)').matches

function BookWithChapters(props: EarthBookProps & { chapters: NonNullable<EarthBookProps['chapters']> }) {
  const { chapters } = props
  const systemReducedMotion = useReducedMotion()
  const motionConfig = useContext(MotionConfigContext)
  const smallViewport = useSyncExternalStore(subscribeViewport, isSmallViewport, () => false)
  const gentle = systemReducedMotion || motionConfig.reducedMotion === 'always' || smallViewport
  const nav = useBookNavigation(props)
  const heading = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (props.presented !== false) heading.current?.focus({ preventScroll: true })
  }, [props.presented])
  const leftPage = useRef<HTMLElement>(null)
  const rightPage = useRef<HTMLElement>(null)
  const [outgoing, setOutgoing] = useState<{ left: HTMLElement; right: HTMLElement } | null>(null)
  function navigate(index: number) {
    if (busy || (index === nav.activeIndex && nav.phase !== 'error') || !chapters[index]) return
    if ((nav.phase === 'ready' || nav.phase === 'error') && leftPage.current && rightPage.current) {
      setOutgoing({ left: capturePage(leftPage.current), right: capturePage(rightPage.current) })
    }
    void nav.navigate(index)
  }
  const showingTarget = nav.phase === 'flipping' || nav.phase === 'loading'
  const displayIndex = showingTarget ? nav.pendingIndex ?? nav.activeIndex : nav.activeIndex
  const chapter = chapters[displayIndex]
  const target = chapters[nav.pendingIndex ?? nav.activeIndex]
  const busy = nav.phase !== 'ready' && nav.phase !== 'error'
  const live = props.presented !== false && (nav.phase === 'ready' || nav.phase === 'leaving')
  const number = String(displayIndex + 1).padStart(2, '0')
  const slot = { chapter, isActive: props.presented !== false && nav.phase === 'ready', interactionDisabled: props.presented === false || nav.phase !== 'ready' }

  return <main inert={props.presented === false} id={props.presented === false ? undefined : 'main-content'} className="reader" onKeyDown={event => {
    if (!(event.target instanceof HTMLElement) || event.target.closest('button, a, input, select, textarea, [contenteditable="true"], [data-book-interactive]')) return
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      navigate(nav.activeIndex + (event.key === 'ArrowRight' ? 1 : -1))
    }
  }}>
    <div className="reader-toolbar flex items-center justify-between gap-4">
      <button className="quiet-button" onClick={props.onClose}><ArrowLeft size={15} /> Close atlas</button>
      <span className="toolbar-caption"><BookOpen size={14} /> FIELD NOTES FROM A CHANGING PLANET</span>
      <span className="chapter-counter">{number} <span>/ {String(chapters.length).padStart(2, '0')}</span></span>
    </div>
    <div className="book-and-tabs">
      <div className={`book-spread phase-${nav.phase}`} aria-busy={busy}>
        <section ref={leftPage} className="book-page left-page" aria-label="Visualization and audio" inert={busy || nav.phase === 'error'}>
          <p className="eyebrow">CHAPTER {number} / {chapter.category}</p>
          <h1 ref={heading} tabIndex={-1}>{chapter.shortTitle}</h1>
          <div className="visualization-slot" data-book-interactive>
            {live && props.renderVisualization ? props.renderVisualization(slot) : <VisualizationPreview chapter={chapter} />}
          </div>
          <div className="audio-slot" data-book-interactive>{live && props.renderAudio ? props.renderAudio(slot) : <AudioPlaceholder />}</div>
        </section>
        <section ref={rightPage} className="book-page right-page" aria-label="Chapter notes" inert={busy || nav.phase === 'error'}>
          {props.renderInspector ? props.renderInspector(slot) : <ChapterNotes key={chapter.id} chapter={chapter} number={number} />}
        </section>
        <div className="book-binding" aria-hidden="true" />
        {nav.phase === 'flipping' && outgoing && (smallViewport ?
          <motion.div className="mobile-turn" aria-hidden="true" initial={{ opacity: 1 }} animate={{ opacity: 0 }}
            transition={{ duration: 0.16 }} onAnimationComplete={nav.completeFlip}
            style={{ gridTemplateRows: `${outgoing.left.dataset.snapshotHeight}px 1fr` }}>
            <div><PageSnapshot page={outgoing.left} /></div><div><PageSnapshot page={outgoing.right} /></div>
          </motion.div> : <>
          {/* Keep the old stationary page until the sheet completely covers it. */}
          <motion.div className={`stationary-page ${nav.direction === 'forward' ? 'stationary-left' : 'stationary-right'}`}
            aria-hidden="true" initial={{ opacity: 1 }}
            animate={{ opacity: gentle ? 0 : 1 }}
            transition={{ duration: gentle ? 0.16 : 0.9, ease: 'linear' }}>
            <PageSnapshot page={nav.direction === 'forward' ? outgoing.left : outgoing.right} />
          </motion.div>
          <motion.div className={`turning-leaf ${nav.direction} ${gentle ? 'gentle-turn' : ''}`} aria-hidden="true"
            initial={{ rotateY: 0, opacity: 1 }}
            animate={gentle ? { opacity: 0 } : { rotateY: nav.direction === 'forward' ? -180 : 180 }}
            transition={{ duration: gentle ? 0.16 : 0.9, ease: [0.45, 0, 0.55, 1] }}
            onAnimationComplete={nav.completeFlip}>
            <div className="leaf-face leaf-front"><PageSnapshot page={nav.direction === 'forward' ? outgoing.right : outgoing.left} /></div>
            {!gentle && <div className="leaf-face leaf-back"><PageSnapshot sourceRef={nav.direction === 'forward' ? leftPage : rightPage} /></div>}
          </motion.div>
        </>)}
        {(nav.phase === 'loading' || nav.phase === 'error') && <div className="book-status" role={nav.phase === 'error' ? 'alert' : 'status'}>
          <BookOpen size={28} /><h2>{nav.phase === 'error' ? 'This chapter is taking a pause.' : 'Preparing your next observation…'}</h2>
          <p>{nav.error || 'The preview is ready. Waiting for chapter data.'}</p>
          <div className="flex flex-wrap justify-center gap-3">{nav.phase === 'error' && <button className="primary-button" onClick={() => navigate(nav.pendingIndex ?? nav.activeIndex)}><RotateCcw size={15} /> Try again</button>}<button className="quiet-button" onClick={nav.pendingIndex === nav.activeIndex ? props.onClose : nav.cancel}><X size={15} /> {nav.pendingIndex === nav.activeIndex ? 'Close atlas' : 'Return to previous chapter'}</button></div>
        </div>}
      </div>
      <nav className="bookmarks" aria-label="Chapters">{chapters.map((item, index) => <button key={item.id} className="bookmark" aria-label={`Chapter ${index + 1}: ${item.title}`} aria-current={index === nav.activeIndex ? 'page' : undefined} disabled={busy} onClick={() => navigate(index)}><span>{String(index + 1).padStart(2, '0')}</span><span className="bookmark-tooltip">{item.title}</span></button>)}</nav>
    </div>
    <footer className="reader-footer flex items-center justify-between gap-4">
      <button className="quiet-button" disabled={busy || nav.activeIndex === 0} onClick={() => navigate(nav.activeIndex - 1)}><ArrowLeft size={16} /> Previous</button>
      <span className="navigation-hint">Use bookmarks or ← → to turn the page</span>
      <button className="quiet-button" disabled={busy || nav.activeIndex === chapters.length - 1} onClick={() => navigate(nav.activeIndex + 1)}>Next chapter <ArrowRight size={16} /></button>
    </footer>
    <p className="sr-only" aria-live="polite">{busy ? `Opening ${target.title}` : `Chapter ${number}: ${chapter.title}`}</p>
  </main>
}

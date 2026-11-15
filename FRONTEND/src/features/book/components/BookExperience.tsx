import { animate, useReducedMotion } from 'motion/react'
import { useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react'
import type { Ref, RefObject } from 'react'
import { BookCover } from './BookCover'
import { EarthBook } from './EarthBook'
import { PageSnapshot } from './PageSnapshot'
import { capturePage } from '../capture-page'
import type { EarthBookProps } from '../types'

type Pose = { left: number; top: number; width: number; height: number }
type Journey = {
  direction: 'open' | 'close'
  cover: HTMLElement
  spread: HTMLElement
  leftPage: HTMLElement
  compact: boolean
  source: Pose
  destination: Pose
}

function measure(element: HTMLElement): Pose {
  const { left, top, width, height } = element.getBoundingClientRect()
  return { left, top, width, height }
}

export function BookExperience({ reduceMotion, ref, bookProps }: { reduceMotion: boolean; ref?: Ref<{ close: () => void }>; bookProps?: Omit<EarthBookProps, 'onClose' | 'presented'> }) {
  const landing = useRef<HTMLDivElement>(null)
  const reader = useRef<HTMLDivElement>(null)
  const locked = useRef(false)
  const restoreLandingFocus = useRef(false)
  const [phase, setPhase] = useState<'closed' | 'opening' | 'open' | 'closing'>('closed')
  const [journey, setJourney] = useState<Journey | null>(null)
  const systemReduced = useReducedMotion()

  function start(direction: Journey['direction']) {
    if (locked.current || (direction === 'close' && phase !== 'open') || (direction === 'open' && phase !== 'closed')) return
    const cover = landing.current?.querySelector<HTMLElement>('.book-cover')
    const spread = reader.current?.querySelector<HTMLElement>('.book-spread')
    const leftPage = reader.current?.querySelector<HTMLElement>('.left-page')
    // A chapter turn must finish before the cover can fold over it.
    if (!cover || !spread || !leftPage || (direction === 'close' && spread.getAttribute('aria-busy') === 'true')) return
    restoreLandingFocus.current = direction === 'close'
    locked.current = true
    setJourney({ direction, compact: window.matchMedia('(max-width: 900px)').matches, cover: capturePage(cover), spread: capturePage(spread), leftPage: capturePage(leftPage), source: measure(cover), destination: measure(spread) })
    setPhase(direction === 'open' ? 'opening' : 'closing')
  }

  useImperativeHandle(ref, () => ({ close: () => start('close') }))
  useEffect(() => {
    if (phase === 'closed' && restoreLandingFocus.current) {
      landing.current?.querySelector<HTMLElement>('.open-link')?.focus({ preventScroll: true })
      restoreLandingFocus.current = false
    }
  }, [phase])

  function finish() {
    const opening = journey?.direction === 'open'
    setPhase(opening ? 'open' : 'closed')
    setJourney(null)
    locked.current = false
  }

  return <div className={`atlas-stage atlas-stage-${phase}`} aria-busy={Boolean(journey)}>
    <div ref={landing} className="landing-layer" inert={phase !== 'closed'} aria-hidden={phase !== 'closed'}>
      <BookCover active={phase === 'closed'} onOpen={() => start('open')} />
    </div>
    <div ref={reader} className="reader-layer" inert={phase !== 'open'} aria-hidden={phase !== 'open'}>
      <EarthBook initialChapterId="carbon-dioxide" {...bookProps} presented={phase === 'open'} onClose={() => start('close')} />
    </div>
    {journey && <CoverJourney journey={journey} landing={landing} reduceMotion={Boolean(reduceMotion || systemReduced || journey.compact)} onFinish={finish} />}
    <span className="sr-only" aria-live="polite">{phase === 'opening' ? 'Opening the atlas' : phase === 'closing' ? 'Closing the atlas' : ''}</span>
  </div>
}

function CoverJourney({ journey, landing, reduceMotion, onFinish }: { journey: Journey; landing: RefObject<HTMLDivElement | null>; reduceMotion: boolean; onFinish: () => void }) {
  const scene = useRef<HTMLDivElement>(null)
  const lid = useRef<HTMLDivElement>(null)
  const complete = useRef(onFinish)
  useLayoutEffect(() => { complete.current = onFinish }, [onFinish])
  const { source, destination, direction } = journey
  const half = destination.width / 2
  const startX = source.left - destination.left - source.width
  const startY = source.top - destination.top
  // The cover and each spread half share the same aspect ratio.
  // One scalar preserves proportions throughout flight and its reverse.
  const startScale = source.width / half
  const opening = direction === 'open'

  useLayoutEffect(() => {
    if (!scene.current || !lid.current) return
    const body = scene.current
    const cover = lid.current
    const copy = landing.current?.querySelector<HTMLElement>('.landing-copy')
    const centerX = (window.innerWidth - half) / 2 - destination.left - half
    const centerY = Math.max(20, (window.innerHeight - destination.height) / 2) - destination.top
    const running: { stop: () => void }[] = []
    let cancelled = false
    const easing = [0.4, 0, 0.2, 1] as const
    const flight = (home: boolean) => {
      const control = animate(body, {
        x: home ? [centerX, startX] : [startX, centerX],
        y: home ? [centerY, startY] : [startY, centerY],
        scale: home ? [1, startScale] : [startScale, 1],
      }, { duration: 0.7, ease: easing })
      running.push(control)
      return control
    }
    const fold = (close: boolean) => {
      const rotation = animate(cover, { rotateY: close ? [-180, 0] : [0, -180] }, { duration: 0.85, ease: easing })
      const placement = animate(body, { x: close ? [0, centerX] : [centerX, 0], y: close ? [0, centerY] : [centerY, 0] }, { duration: 0.85, ease: easing })
      running.push(rotation, placement)
      return Promise.all([rotation, placement])
    }
    const fadeCopy = (visible: boolean) => {
      if (!copy) return Promise.resolve()
      const control = animate(copy, { opacity: visible ? [0, 1] : [1, 0] }, { duration: reduceMotion ? 0.12 : 0.25 })
      running.push(control)
      return control
    }
    async function run() {
      if (reduceMotion) {
        // Respect motion preferences without replaying the long spatial sequence.
        await fadeCopy(!opening)
      } else if (opening) {
        await fadeCopy(false)
        if (cancelled) return
        await flight(false)
        if (cancelled) return
        await fold(false)
      } else {
        await fold(true)
        if (cancelled) return
        await flight(true)
        if (cancelled) return
        await fadeCopy(true)
      }
      if (!cancelled) complete.current()
    }
    // Measurements are viewport-relative. Settle safely if that viewport moves.
    const settle = () => { if (!cancelled) complete.current() }
    window.addEventListener('resize', settle)
    window.addEventListener('scroll', settle, { passive: true })
    void run()
    return () => {
      cancelled = true
      running.forEach(control => control.stop())
      window.removeEventListener('resize', settle)
      window.removeEventListener('scroll', settle)
      if (copy) { copy.style.removeProperty('opacity'); copy.style.removeProperty('transform') }
    }
  }, [journey, landing, reduceMotion, destination, half, opening, startX, startY, startScale])

  return <div className={`cover-journey ${reduceMotion ? 'cover-journey-reduced' : ''}`} aria-hidden="true" inert>
    <div ref={scene} className="cover-scene" style={{ left: destination.left, top: destination.top, width: destination.width, height: destination.height, transform: opening ? `translate(${startX}px, ${startY}px) scale(${startScale})` : 'none' }}>
      <div className="cover-scene-pages"><PageSnapshot page={journey.spread} /></div>
      <div ref={lid} className="cover-scene-lid" style={{ transform: opening ? 'rotateY(0deg)' : 'rotateY(-180deg)' }}>
        <div className="cover-scene-front"><div className="cover-front-scale" style={{ width: source.width, height: source.height, transform: `scale(${half / source.width})` }}><PageSnapshot page={journey.cover} /></div></div>
        <div className="cover-scene-back"><PageSnapshot page={journey.leftPage} /></div>
      </div>
    </div>
  </div>
}

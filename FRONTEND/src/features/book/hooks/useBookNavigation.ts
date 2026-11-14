import { useEffect, useRef, useState } from 'react'
import { waitForPageTurn } from '../wait-for-page-turn'
import type { BookPhase, EarthBookProps } from '../types'

export function useBookNavigation({ chapters, initialChapterId, onBeforeChapterChange, prepareChapter, onChapterChange }: Required<Pick<EarthBookProps, 'chapters'>> & EarthBookProps) {
  const initial = Math.max(0, chapters.findIndex(chapter => chapter.id === initialChapterId))
  const [activeIndex, setActiveIndex] = useState(initial)
  const [pendingIndex, setPendingIndex] = useState<number | null>(prepareChapter ? initial : null)
  const [phase, setPhase] = useState<BookPhase>(prepareChapter ? 'loading' : 'ready')
  const [error, setError] = useState('')
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const locked = useRef(Boolean(prepareChapter))
  const controller = useRef<AbortController | null>(null)
  const finishFlip = useRef<(() => void) | null>(null)
  const initialLoad = useRef({ chapter: chapters[initial], prepareChapter })
  useEffect(() => {
    const request = new AbortController()
    controller.current = request
    const prepare = initialLoad.current.prepareChapter
    if (prepare) {
      Promise.resolve().then(() => prepare(initialLoad.current.chapter, request.signal)).then(() => {
        if (request.signal.aborted) return
        locked.current = false
        setPendingIndex(null)
        setPhase('ready')
      }, () => {
        if (request.signal.aborted) return
        locked.current = false
        setError('Unable to prepare this chapter. Please try again.')
        setPhase('error')
      })
    }
    return () => { controller.current?.abort(); finishFlip.current?.() }
  }, [])

  async function navigate(index: number) {
    if (locked.current || (index === activeIndex && phase !== 'error') || !chapters[index]) return
    locked.current = true
    controller.current?.abort()
    const request = new AbortController()
    controller.current = request
    setPendingIndex(index)
    setDirection(index > activeIndex ? 'forward' : 'backward')
    setError('')
    setPhase('leaving')
    try {
      await onBeforeChapterChange?.(chapters[activeIndex], request.signal)
      if (request.signal.aborted) return
      setPhase('flipping')
      const prepared = Promise.resolve().then(() => prepareChapter?.(chapters[index], request.signal))
      const flipped = new Promise<void>(resolve => {
        // Motion completion, not a wall-clock timer, determines the handoff.
        finishFlip.current = () => { finishFlip.current = null; resolve() }
      })
      await waitForPageTurn(prepared, flipped, () => {
        if (!request.signal.aborted) setPhase('loading')
      })
      if (request.signal.aborted) return
      setActiveIndex(index)
      setPendingIndex(null)
      setPhase('ready')
      locked.current = false
      onChapterChange?.(chapters[index])
    } catch {
      if (!request.signal.aborted) {
        setError('Unable to prepare this chapter. Please try again or return to the previous chapter.')
        setPhase('error')
        locked.current = false
      }
    }
  }
  function cancel() {
    controller.current?.abort()
    finishFlip.current?.()
    locked.current = false
    setPendingIndex(null)
    setPhase('ready')
    setError('')
  }
  return { activeIndex, pendingIndex, phase, direction, error, navigate, cancel, completeFlip: () => finishFlip.current?.() }
}

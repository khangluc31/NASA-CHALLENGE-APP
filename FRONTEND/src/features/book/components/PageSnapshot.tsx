import { useLayoutEffect, useRef } from 'react'
import type { RefObject } from 'react'
import { capturePage } from '../capture-page'

export function PageSnapshot({ page, sourceRef }: { page?: HTMLElement; sourceRef?: RefObject<HTMLElement | null> }) {
  const host = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    const source = page ?? sourceRef?.current
    if (!host.current || !source) return
    const copy = capturePage(source)
    host.current.replaceChildren(copy)
    for (const element of copy.querySelectorAll<HTMLElement>('[data-snapshot-scroll]')) {
      element.scrollTop = Number(element.dataset.snapshotScroll)
    }
    const container = host.current
    return () => container.replaceChildren()
  }, [page, sourceRef])
  return <div ref={host} className="page-snapshot" aria-hidden="true" inert />
}

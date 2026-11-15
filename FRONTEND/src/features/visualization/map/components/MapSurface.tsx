import { useEffect, useRef } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import type { MapLocation, MapNavigationAction, MapPoint, MapView } from '../types'
import { MAP_HEIGHT, MAP_WIDTH, mapPointToLocation } from '../utils/coordinates'

interface MapSurfaceProps {
  imageUrl?: string
  view: MapView
  locked: boolean
  instructionsId: string
  onSelect?: (location: MapLocation) => void
  onPan: (x: number, y: number) => void
  onZoom: (factor: number, anchor: MapPoint) => void
  onAction: (action: MapNavigationAction) => void
  children?: ReactNode
}

interface TrackedPointer { point: MapPoint; startX: number; startY: number; moved: boolean }

export function MapSurface({ imageUrl, view, locked, instructionsId, onSelect, onPan, onZoom, onAction, children }: MapSurfaceProps) {
  const svg = useRef<SVGSVGElement>(null)
  const pointers = useRef(new Map<number, TrackedPointer>())
  useEffect(() => { pointers.current.clear() }, [locked])

  function localPoint(clientX: number, clientY: number): MapPoint | null {
    const matrix = svg.current?.getScreenCTM()
    if (!matrix) return null
    return new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse())
  }

  // A native listener allows preventing page scrolling only while this map is focused.
  useEffect(() => {
    const element = svg.current
    if (!element) return
    function wheel(event: WheelEvent) {
      if (locked || document.activeElement !== element) return
      const point = localPoint(event.clientX, event.clientY)
      if (!point) return
      event.preventDefault()
      pointers.current.forEach((pointer) => { pointer.moved = true })
      onZoom(event.deltaY < 0 ? 1.15 : 1 / 1.15, point)
    }
    element.addEventListener('wheel', wheel, { passive: false })
    return () => element.removeEventListener('wheel', wheel)
  }, [locked, onZoom])

  function pointerDown(event: PointerEvent<SVGSVGElement>) {
    if (locked || event.button !== 0) return
    const point = localPoint(event.clientX, event.clientY)
    if (!point) return
    event.currentTarget.focus({ preventScroll: true })
    event.currentTarget.setPointerCapture(event.pointerId)
    pointers.current.set(event.pointerId, { point, startX: event.clientX, startY: event.clientY, moved: !event.isPrimary })
    if (pointers.current.size > 1) pointers.current.forEach((pointer) => { pointer.moved = true })
  }

  function pointerMove(event: PointerEvent<SVGSVGElement>) {
    const tracked = pointers.current.get(event.pointerId)
    const point = localPoint(event.clientX, event.clientY)
    if (locked || !tracked || !point) return
    if (Math.hypot(event.clientX - tracked.startX, event.clientY - tracked.startY) > 5) tracked.moved = true
    const other = [...pointers.current.entries()].find(([id]) => id !== event.pointerId)?.[1]
    if (other) {
      const previousDistance = Math.hypot(tracked.point.x - other.point.x, tracked.point.y - other.point.y)
      const nextDistance = Math.hypot(point.x - other.point.x, point.y - other.point.y)
      const anchor = { x: (tracked.point.x + other.point.x) / 2, y: (tracked.point.y + other.point.y) / 2 }
      if (previousDistance > 0 && nextDistance > 0) onZoom(nextDistance / previousDistance, anchor)
      onPan((point.x - tracked.point.x) / 2, (point.y - tracked.point.y) / 2)
    } else if (tracked.moved) {
      onPan(point.x - tracked.point.x, point.y - tracked.point.y)
    }
    tracked.point = point
  }

  function pointerUp(event: PointerEvent<SVGSVGElement>) {
    const tracked = pointers.current.get(event.pointerId)
    pointers.current.delete(event.pointerId)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    if (locked || !onSelect || !tracked || tracked.moved || !event.isPrimary || event.button !== 0
      || Math.hypot(event.clientX - tracked.startX, event.clientY - tracked.startY) > 5) return
    const point = localPoint(event.clientX, event.clientY)
    if (!point) return
    const x = (point.x - view.x) / view.zoom
    const y = (point.y - view.y) / view.zoom
    if (x >= 0 && x <= MAP_WIDTH && y >= 0 && y <= MAP_HEIGHT) onSelect(mapPointToLocation({ x, y }))
  }

  function keyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return
    if (event.key === 'Enter') {
      event.preventDefault()
      if (!locked && onSelect) onSelect(mapPointToLocation({ x: (MAP_WIDTH / 2 - view.x) / view.zoom, y: (MAP_HEIGHT / 2 - view.y) / view.zoom }))
      return
    }
    const actions: Record<string, MapNavigationAction> = {
      ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down',
      '+': 'in', '=': 'in', '-': 'out', Home: 'reset',
    }
    const action = actions[event.key]
    if (action) { event.preventDefault(); if (!locked) onAction(action) }
  }

  return <svg ref={svg} className={`map-viewer__surface${locked ? ' map-viewer__surface--locked' : ''}`}
    viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`} role="group" aria-label="Interactive world map"
    aria-describedby={instructionsId} aria-disabled={locked} tabIndex={0}
    onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
    onPointerCancel={(event) => { pointers.current.delete(event.pointerId) }}
    onLostPointerCapture={(event) => { pointers.current.delete(event.pointerId) }}
    onKeyDown={keyDown}>
    <g transform={`translate(${view.x} ${view.y}) scale(${view.zoom})`}>
      <rect width={MAP_WIDTH} height={MAP_HEIGHT} fill="var(--bg)" />
      {imageUrl ? <image href={imageUrl} width={MAP_WIDTH} height={MAP_HEIGHT} pointerEvents="none" />
        : <g stroke="var(--border)" fill="none" pointerEvents="none" aria-hidden="true">
          {[0, 120, 240, 360, 480, 600, 720].map((x) => <path key={`x${x}`} d={`M ${x} 0 V ${MAP_HEIGHT}`} />)}
          {[0, 60, 120, 180, 240, 300, 360].map((y) => <path key={`y${y}`} d={`M 0 ${y} H ${MAP_WIDTH}`} />)}
        </g>}
      {children}
    </g>
    <path className="map-viewer__aim" d="M 350 180 H 370 M 360 170 V 190" pointerEvents="none" aria-hidden="true" />
  </svg>
}

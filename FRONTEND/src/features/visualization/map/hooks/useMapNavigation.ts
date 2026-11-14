import { useCallback, useState } from 'react'
import type { MapNavigationAction, MapPoint, MapView } from '../types'
import { constrainView, MAP_HEIGHT, MAP_WIDTH, zoomView } from '../utils/coordinates'

const INITIAL_VIEW: MapView = { zoom: 1, x: 0, y: 0 }
const CENTER = { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 }

export function useMapNavigation(locked: boolean) {
  const [view, setView] = useState(INITIAL_VIEW)
  const panBy = useCallback((x: number, y: number) => {
    if (!locked) setView((current) => constrainView({ ...current, x: current.x + x, y: current.y + y }))
  }, [locked])
  const zoomAt = useCallback((factor: number, anchor: MapPoint = CENTER) => {
    if (!locked) setView((current) => zoomView(current, factor, anchor))
  }, [locked])
  function act(action: MapNavigationAction) {
    if (locked) return
    switch (action) {
      case 'left': panBy(72, 0); break
      case 'right': panBy(-72, 0); break
      case 'up': panBy(0, 36); break
      case 'down': panBy(0, -36); break
      case 'in': zoomAt(1.25); break
      case 'out': zoomAt(1 / 1.25); break
      case 'reset': setView(INITIAL_VIEW); break
    }
  }
  return { view, panBy, zoomAt, act }
}

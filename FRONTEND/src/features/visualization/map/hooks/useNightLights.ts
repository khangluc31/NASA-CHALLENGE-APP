import { useEffect, useState } from 'react'
import { parseNightLights } from '../../../../data/adapters/nightLights'
import type { NightLightsData } from '../../../../data/adapters/nightLights'

type Result = { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: NightLightsData }
// Bounded to one immutable dataset; no global selection or playback state.
let cached: NightLightsData | undefined

export function useNightLights() {
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<Result>(() => cached ? { status: 'ready', data: cached } : { status: 'loading' })
  useEffect(() => {
    if (cached) return
    const controller = new AbortController()
    async function load() {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/night-lights/map.json`, { signal: controller.signal })
        if (!response.ok) throw new Error('Night Lights request failed.')
        const data = parseNightLights(await response.json())
        if (!controller.signal.aborted) { cached = data; setResult({ status: 'ready', data }) }
      } catch {
        if (!controller.signal.aborted) setResult({ status: 'error' })
      }
    }
    void load()
    return () => controller.abort()
  }, [attempt])
  return { result, retry: () => { setResult({ status: 'loading' }); setAttempt((value) => value + 1) } }
}

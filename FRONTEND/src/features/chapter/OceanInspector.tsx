import { useEffect, useState } from 'react'
import { getOceanFrame, parseOcean } from '../../data/adapters/ocean'
import type { OceanData } from '../../data/adapters/ocean'
import type { VideoCurrentView } from '../visualization/media/useCurrentView'
import './current-view.css'

type Result = { status: 'loading' | 'error' } | { status: 'ready'; data: OceanData }

export function OceanInspector({ view, disabled }: { view?: VideoCurrentView; disabled: boolean }) {
  const [result, setResult] = useState<Result>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void fetch(`${import.meta.env.BASE_URL}data/ocean/ocean.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Ocean estimates unavailable'); return response.json() as Promise<unknown> })
      .then(parseOcean)
      .then(data => { if (!controller.signal.aborted) setResult({ status: 'ready', data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: 'error' }) })
    return () => controller.abort()
  }, [attempt])
  const frame = view?.status === 'paused' && result.status === 'ready' ? getOceanFrame(result.data, view.time, view.duration) : null
  return <div className="current-view" data-book-interactive>
    <header><p className="current-view__kicker">Current view</p><h3>Sea surface temperature</h3></header>
    <p className="current-view__context">Approximate temperature summary</p>
    <p>Switch to Map view to explore the full pattern alongside these estimates.</p>
    <div role="status" aria-live="polite">
      {!view || view.status === 'loading' ? <p>Loading the animation…</p>
        : view.status === 'error' ? <p>Current view unavailable. Retry the animation to inspect its estimates.</p>
        : view.status === 'playing' ? <p>Pause the animation to inspect its temperatures.</p>
        : result.status === 'loading' ? <p>Loading temperature estimates…</p>
        : result.status === 'error' ? <><p>Temperature estimates could not be loaded.</p><button type="button" disabled={disabled} onClick={() => { setResult({ status: 'loading' }); setAttempt(value => value + 1) }}>Retry estimates</button></>
        : !frame || frame.mean === null || frame.lower === null || frame.upper === null ? <p>Temperature estimates unavailable.</p>
        : <>
          <section className="current-view__reading" aria-label="Approximate mean sea surface temperature">
            <span>Estimated mean</span><div className="current-view__value"><strong>{frame.mean.toFixed(1)}</strong><span> °C</span></div>
          </section>
          <dl className="current-view__range"><div><dt>Lower estimate · 10th percentile</dt><dd>{frame.lower.toFixed(1)} °C</dd></div>
            <div><dt>Upper estimate · 90th percentile</dt><dd>{frame.upper.toFixed(1)} °C</dd></div></dl>
        </>}
    </div>
    <footer className="current-view__footnote"><p>These estimates describe a limited portion of the animation, not a global ocean average or the temperature at a selected location.</p></footer>
  </div>
}

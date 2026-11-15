import { useEffect, useState } from 'react'
import { getCarbonDioxideFrame, parseCarbonDioxide } from '../../data/adapters/carbonDioxide'
import type { CarbonDioxideData } from '../../data/adapters/carbonDioxide'
import type { CarbonDioxideView } from '../visualization/carbon-dioxide/useCurrentView'
import './carbon-dioxide-inspector.css'

type Result = { status: 'loading' | 'error' } | { status: 'ready'; data: CarbonDioxideData }

export function CarbonDioxideInspector({ view, disabled }: { view?: CarbonDioxideView; disabled: boolean }) {
  const [result, setResult] = useState<Result>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    void fetch(`${import.meta.env.BASE_URL}data/carbon-dioxide/co2.json`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('CO₂ data unavailable'); return response.json() as Promise<unknown> })
      .then(parseCarbonDioxide)
      .then(data => { if (!controller.signal.aborted) setResult({ status: 'ready', data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: 'error' }) })
    return () => controller.abort()
  }, [attempt])
  const frame = view?.status === 'paused' && result.status === 'ready' ? getCarbonDioxideFrame(result.data, view.time, view.duration) : null
  return <div className="co2-view" data-book-interactive>
    <header><p className="co2-view__kicker">Current view</p><h3>Atmospheric carbon dioxide</h3></header>
    <p className="co2-view__context">Approximate estimates from animation colors</p>
    <div role="status" aria-live="polite">
      {!view || view.status === 'loading' ? <p>Loading the animation…</p>
        : view.status === 'error' ? <p>Current view unavailable. Retry the animation to inspect its estimates.</p>
        : view.status === 'playing' ? <p>Pause the animation to inspect a frame.</p>
        : result.status === 'loading' ? <p>Loading view estimates…</p>
        : result.status === 'error' ? <><p>View estimates could not be loaded.</p><button type="button" disabled={disabled} onClick={() => { setResult({ status: 'loading' }); setAttempt(value => value + 1) }}>Retry estimates</button></>
        : !frame || frame.mean === null || frame.lower === null || frame.upper === null ? <p>Frame estimates unavailable.</p>
        : <>
          <section className="co2-view__reading" aria-label="Approximate mean carbon dioxide">
            <span>Estimated mean</span><div className="co2-view__value"><strong>{frame.mean.toFixed(1)}</strong><span> ppm</span></div>
          </section>
          <dl className="co2-view__range"><div><dt>Lower estimate · 1st percentile</dt><dd>{frame.lower.toFixed(1)} ppm</dd></div>
            <div><dt>Upper estimate · 99th percentile</dt><dd>{frame.upper.toFixed(1)} ppm</dd></div></dl>
        </>}
    </div>
    <footer className="co2-view__footnote"><p>These estimates summarize color-matched pixels across the source animation frame. They are not a global atmospheric mean or measurements at the selected coordinate.</p>
      <p>Surface blending and atmospheric opacity affect the extracted colors. Rotating the globe does not change these estimates.</p></footer>
  </div>
}

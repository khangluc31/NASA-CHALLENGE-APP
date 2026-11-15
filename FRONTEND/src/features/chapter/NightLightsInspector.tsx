import { useId } from 'react'
import type { GlobeLocation } from '../visualization/globe'
import { useNightLights } from '../visualization/map/hooks/useNightLights'
import { getNightLightsArea } from '../../data/adapters/nightLights'
import './night-lights-inspector.css'

type Area = NonNullable<ReturnType<typeof getNightLightsArea>>

function AnnualTrend({ area }: { area: Area }) {
  const titleId = useId()
  const x = (year: number) => 30 + (year - 2012) / 11 * 360
  const y = (value: number) => 128 - value * 108
  const path = area.series.map((sample, index) => {
    if (sample.value === null) return ''
    const command = index > 0 && area.series[index - 1].value !== null ? 'L' : 'M'
    return `${command}${x(sample.year)},${y(sample.value)}`
  }).join(' ')
  return <figure className="night-area__trend">
    <figcaption><span>Annual brightness</span><span>2012—2023</span></figcaption>
    <svg viewBox="0 0 420 156" role="img" aria-labelledby={titleId}>
      <title id={titleId}>Relative brightness on a fixed zero-to-one scale. Gaps mean missing data; hollow points mean partial coverage. {area.current.year} is selected. Exact values follow in the annual data table.</title>
      {[0, 0.5, 1].map(value => <g key={value}>
        <line x1="30" x2="390" y1={y(value)} y2={y(value)} className="night-area__grid" />
        <text x="20" y={y(value) + 3} textAnchor="end">{value}</text>
      </g>)}
      <line x1={x(area.current.year)} x2={x(area.current.year)} y1="14" y2="132" className="night-area__cursor" />
      <path d={path} className="night-area__line" />
      {area.series.map(sample => sample.value !== null && <circle key={sample.year}
        cx={x(sample.year)} cy={y(sample.value)} r={sample.year === area.current.year ? 4.5 : 2.5}
        className={sample.coverage < 1 ? 'night-area__point night-area__point--partial' : 'night-area__point'} />)}
      <text x="30" y="150">2012</text><text x="390" y="150" textAnchor="end">2023</text>
    </svg>
    <p className="night-area__chart-note">Gaps: unavailable years · Hollow points: partial coverage</p>
    <details>
      <summary>View annual values</summary>
      <table>
        <caption className="sr-only">Selected grid area's annual extracted brightness and coverage</caption>
        <thead><tr><th scope="col">Year</th><th scope="col">Brightness / 1</th><th scope="col">Coverage</th></tr></thead>
        <tbody>{area.series.map(sample => <tr key={sample.year} aria-current={sample.year === area.current.year ? 'true' : undefined}>
          <th scope="row">{sample.year}</th><td>{sample.value === null ? 'Unavailable' : sample.value.toFixed(4)}</td>
          <td>{(sample.coverage * 100).toFixed(1)}%{sample.coverage > 0 && sample.coverage < 1 ? ' · partial' : ''}</td>
        </tr>)}</tbody>
      </table>
    </details>
  </figure>
}

function coordinate(value: number, positive: string, negative: string) {
  return `${Math.abs(value).toFixed(2)}° ${value < 0 ? negative : positive}`
}

export function NightLightsInspector({ location, year, onClear, disabled }: {
  location: GlobeLocation; year: number; onClear: () => void; disabled: boolean
}) {
  const { result, retry } = useNightLights()
  const area = result.status === 'ready' ? getNightLightsArea(result.data, location, year) : null
  return <div className="night-area" data-book-interactive>
    <header className="night-area__header">
      <div><p className="night-area__kicker">Selected area</p>
        <h3>{coordinate(location.latitude, 'N', 'S')}<span> / </span>{coordinate(location.longitude, 'E', 'W')}</h3></div>
      <button type="button" onClick={onClear} disabled={disabled}>Clear</button>
    </header>
    <p className="night-area__context">Regional estimate · 2° × 2° grid cell</p>
    {result.status === 'loading' ? <p role="status">Loading area observations…</p>
      : result.status === 'error' ? <div role="alert"><p>Area observations could not be loaded.</p>
        <button type="button" onClick={retry} disabled={disabled}>Retry observations</button></div>
        : !area ? <p role="status">No observations are available for this selection.</p> : <>
          <section className="night-area__reading" aria-label="Selected annual brightness">
            <div className="night-area__reading-label"><span>Relative night brightness</span><strong>{area.current.year}</strong></div>
            <div className="night-area__value" aria-live="polite">{area.current.value === null ? <span className="night-area__unavailable">Data unavailable</span>
              : <><strong>{area.current.value.toFixed(4)}</strong><span> / 1</span></>}</div>
            {area.current.value !== null && <meter min="0" max="1" value={area.current.value} aria-label={`Relative night brightness, ${area.current.year}`} />}
            {area.current.coverage > 0 && area.current.coverage < 1 && <p className="night-area__coverage">Partial coverage · {(area.current.coverage * 100).toFixed(1)}% of the cell</p>}
            {area.current.value === null && <p className="night-area__coverage">This cell has no covered sample for {area.current.year}. It is not a zero-brightness observation.</p>}
          </section>
          <div className="night-area__change">
            <span>Change since 2012</span>
            <strong>{area.delta === null ? 'Comparison unavailable' : `${area.delta > 0 ? '+' : area.delta < 0 ? '−' : ''}${Math.abs(area.delta).toFixed(4)}`}</strong>
          </div>
          <p className="night-area__explanation">{area.delta === null ? 'Comparison needs full coverage in both years.' : 'Difference on the same 0–1 brightness scale, not a percentage change.'}</p>
          <AnnualTrend area={area} />
          <div className="night-area__footnote">
            <p>Brightness is extracted from NASA visualization imagery, not a physical radiance measurement or a reading at the exact pin.</p>
            <p>Cell bounds: {area.bounds.south}° to {area.bounds.north}° latitude; {area.bounds.west}° to {area.bounds.east}° longitude.</p>
            {!Number.isInteger(year) && <p>The map is blending annual images. Values here use the nearest actual year: {area.current.year}.</p>}
          </div>
        </>}
  </div>
}

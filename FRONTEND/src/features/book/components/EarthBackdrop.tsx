import { useState } from 'react'
import { EARTH_DAY } from '../chapters'

/** Decorative NASA Blue Marble imagery, never used as scientific chapter data. */
export function EarthBackdrop() {
  const [unavailable, setUnavailable] = useState(false)
  return <div className="earth-backdrop" aria-hidden="true">
    <div className="earth-backdrop-glow" />
    {!unavailable && <img className="earth-backdrop-photo" src={EARTH_DAY} alt="" decoding="async" draggable={false} onError={() => setUnavailable(true)} />}
    <div className="earth-backdrop-shade" />
  </div>
}

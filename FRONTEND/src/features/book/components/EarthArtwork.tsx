import { useState } from 'react'
import { Globe2 } from 'lucide-react'
import { EARTH_PREVIEW } from '../chapters'

export function EarthArtwork({ src = EARTH_PREVIEW, className = '' }: { src?: string; className?: string }) {
  const [failedSource, setFailedSource] = useState<string>()
  return <div className={`earth-artwork ${className}`}>
    {failedSource === src ? <div className="earth-fallback"><Globe2 strokeWidth={0.65} aria-hidden="true" /><span>Earth preview unavailable offline</span></div> :
      <img src={src} alt="Decorative NASA composite of Earth at night from 2012; not chapter data" onError={() => setFailedSource(src)} draggable={false} />}
  </div>
}

import { useEffect, useState } from 'react'

type ImageResult = { key: string; status: 'ready' | 'error' }

export function useMapSurfaceImage(path: string | undefined, attempt: number) {
  const url = path ? `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}` : undefined
  const key = `${url ?? ''}:${attempt}`
  const [result, setResult] = useState<ImageResult | null>(null)
  useEffect(() => {
    if (!url) return
    let active = true
    const image = new Image()
    image.onload = () => {
      // The base contract is a complete 2:1 world image, not arbitrary imagery.
      if (active) setResult({ key, status: image.naturalWidth === image.naturalHeight * 2 ? 'ready' : 'error' })
    }
    image.onerror = () => { if (active) setResult({ key, status: 'error' }) }
    image.src = url
    return () => { active = false; image.onload = null; image.onerror = null }
  }, [url, key])
  return { url, status: !url ? 'ready' : result?.key === key ? result.status : 'loading' }
}

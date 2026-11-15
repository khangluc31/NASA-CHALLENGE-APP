import { useEffect, useState } from 'react'

const IMAGES = Array.from({ length: 12 }, (_, index) => `${import.meta.env.BASE_URL}media/night-lights/${2012 + index}.jpg`)
type ImageResult = { status: 'loading' | 'error' } | { status: 'ready'; images: string[]; decodedImages: HTMLImageElement[] }

export function useNightLightsImages() {
  const [result, setResult] = useState<ImageResult>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let active = true
    const controller = new AbortController()
    async function load() {
      try {
        const decodedImages = await Promise.all(IMAGES.map(async (url) => {
          const response = await fetch(url, { signal: controller.signal })
          if (!response.ok) throw new Error('Night Lights image unavailable.')
          const blob = await response.blob()
          controller.signal.throwIfAborted()
          const image = new Image()
          const objectUrl = URL.createObjectURL(blob)
          try {
            image.src = objectUrl
            await image.decode()
            if (image.naturalWidth !== 2048 || image.naturalHeight !== 1024) throw new Error('Invalid annual image size.')
            return image
          } finally { URL.revokeObjectURL(objectUrl) }
        }))
        if (active) setResult({ status: 'ready', images: IMAGES, decodedImages })
      } catch {
        controller.abort()
        if (active) setResult({ status: 'error' })
      }
    }
    void load()
    return () => { active = false; controller.abort() }
  }, [attempt])
  return { result, retry: () => { setResult({ status: 'loading' }); setAttempt(value => value + 1) } }
}

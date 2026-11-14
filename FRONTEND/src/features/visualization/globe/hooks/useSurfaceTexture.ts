import { useEffect, useState } from 'react'
import { SRGBColorSpace, Texture, TextureLoader } from 'three'

type TextureState = { path: string | undefined; attempt: number; texture?: Texture; error?: string }

/** Own each texture so chapter changes release GPU memory, including late loads. */
export function useSurfaceTexture(path?: string, attempt = 0) {
  const [state, setState] = useState<TextureState>({ path, attempt })

  // Invalidate the previous result immediately, including an A -> B -> A change.
  // Otherwise a disposed texture from an earlier request could be reused.
  if (state.path !== path || state.attempt !== attempt) {
    setState({ path, attempt })
  }

  useEffect(() => {
    if (!path) return
    let active = true
    const texture = new TextureLoader().load(
      `${import.meta.env.BASE_URL}${path.replace(/^\/+/, '')}`,
      (loaded) => {
        if (!active) {
          loaded.dispose()
          return
        }
        loaded.colorSpace = SRGBColorSpace
        setState({ path, attempt, texture: loaded })
      },
      undefined,
      () => {
        if (active) setState({ path, attempt, error: 'The globe texture could not be loaded.' })
      },
    )
    return () => {
      active = false
      texture.dispose()
    }
  }, [path, attempt])

  if (!path) return { status: 'ready' as const, texture: undefined }
  if (state.path !== path || state.attempt !== attempt || (!state.texture && !state.error)) {
    return { status: 'loading' as const, texture: undefined }
  }
  if (state.error) return { status: 'error' as const, message: state.error, texture: undefined }
  return { status: 'ready' as const, texture: state.texture }
}

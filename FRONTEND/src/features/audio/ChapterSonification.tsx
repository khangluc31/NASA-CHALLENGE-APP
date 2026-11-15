import { useCallback, useEffect, useMemo, useState } from 'react'
import { SonificationPlayer } from './DemoSonification'
import { ChapterAudioEngine } from './chapter-audio-engine'
import { DATA_PATHS, makeChapterSound, sourceKey } from './chapter-sound'
import type { SoundSource } from './chapter-sound'

type Result = { status: 'loading' | 'error' } | { status: 'ready'; data: unknown }

export function ChapterSonification({ source }: { source: SoundSource }) {
  const [preferences, setPreferences] = useState({ volume: 0.3, muted: false })
  const [result, setResult] = useState<Result>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const path = DATA_PATHS[source.chapter]
  useEffect(() => {
    const controller = new AbortController()
    void fetch(`${import.meta.env.BASE_URL}${path}`, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error('Sound data unavailable'); return response.json() as Promise<unknown> })
      .then(data => { if (!controller.signal.aborted) setResult({ status: 'ready', data }) })
      .catch(() => { if (!controller.signal.aborted) setResult({ status: 'error' }) })
    return () => controller.abort()
  }, [path, attempt])
  const key = sourceKey(source)
  const selection = useMemo(() => {
    if (result.status !== 'ready') return { features: null, failed: false }
    try { return { features: makeChapterSound(result.data, source), failed: false } }
    catch { return { features: null, failed: true } }
    // Selection identity is the year or paused timestamp, independent of camera and pin.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, key, source.chapter])
  const isYear = source.chapter === 'night-lights'
  const label = isYear ? `Night Lights · ${Math.round(source.year ?? 2012)}` : 'Current view'
  const createPlayer = useCallback((onEnded: () => void) => {
    if (!selection.features) throw new Error('No sound for this view')
    return new ChapterAudioEngine(selection.features, label, onEnded)
  }, [selection.features, label])
  const failed = result.status === 'error' || selection.failed
  const message = failed ? 'Sound could not be prepared.' : result.status === 'loading' ? 'Loading sound…'
    : !isYear && source.view?.status !== 'paused' ? 'Pause the animation to listen to the current view.'
    : !selection.features ? 'Sound unavailable for this view.' : label
  return <>
    <SonificationPlayer key={`${source.chapter}-${key}`} createPlayer={createPlayer} sourceLabel={message}
      initialVolume={preferences.volume} initialMuted={preferences.muted}
      onVolumeChange={volume => setPreferences(previous => ({ ...previous, volume }))}
      onMuteChange={muted => setPreferences(previous => ({ ...previous, muted }))}
      disabled={!selection.features} description={isYear ? 'Annual brightness expressed as a melody.' : 'Approximate frame estimate expressed as sound.'} />
    {failed && <button type="button" className="quiet-button" onClick={() => { setResult({ status: 'loading' }); setAttempt(value => value + 1) }}>Retry sound</button>}
  </>
}

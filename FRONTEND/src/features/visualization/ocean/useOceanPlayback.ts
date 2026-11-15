import { useVideoPlayback } from '../media/useVideoPlayback'

const SOURCE = `${import.meta.env.BASE_URL}media/ocean/ecco2-surface-flow-2048.mp4`

export function useOceanPlayback(video: HTMLVideoElement | null, locked: boolean, reduceMotion: boolean) {
  return useVideoPlayback(video, SOURCE, locked, reduceMotion)
}

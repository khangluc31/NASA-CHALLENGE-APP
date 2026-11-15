import { useVideoPlayback } from '../media/useVideoPlayback'

const SOURCE = `${import.meta.env.BASE_URL}media/ocean/ecco2_sst_flow.m4v`

export function useOceanPlayback(video: HTMLVideoElement | null, locked: boolean, reduceMotion: boolean) {
  return useVideoPlayback(video, SOURCE, locked, reduceMotion)
}

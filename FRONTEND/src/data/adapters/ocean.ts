export interface OceanFrame {
  mean: number | null
  lower: number | null
  upper: number | null
}

export interface OceanData {
  fps: number
  duration: number
  frames: OceanFrame[]
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid ocean data')
  return value as Record<string, unknown>
}

function finite(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('Invalid ocean value')
  return value
}

function temperature(value: unknown): number | null {
  if (value === null) return null
  const number = finite(value)
  if (number < 0 || number > 32) throw new Error('Invalid ocean temperature')
  return number
}

export function parseOcean(input: unknown): OceanData {
  const data = record(input)
  const video = record(data.video)
  const scale = record(data.temperature)
  if (data.dataset !== 'global_sea_surface_temperature' || scale.unit !== 'celsius' || scale.min !== 0 || scale.max !== 32 || !Array.isArray(data.frames)) throw new Error('Invalid ocean source')
  const fps = finite(video.fps)
  if (fps <= 0 || !data.frames.length || video.sample_step !== 1 || data.frames.length !== video.total_frames || data.frames.length !== video.processed_frames) throw new Error('Incomplete ocean sequence')
  const frames = data.frames.map((value: unknown, index: number): OceanFrame => {
    const frame = record(value)
    if (frame.frame_id !== index || Math.abs(finite(frame.video_time_seconds) - index / fps) > 0.001) throw new Error('Invalid ocean frame order')
    const values = record(frame.temperature)
    const coverage = finite(values.color_match_coverage)
    const count = finite(values.valid_pixel_count)
    if (coverage < 0 || coverage > 1 || count < 0 || !Number.isInteger(count)) throw new Error('Invalid ocean coverage')
    const mean = temperature(values.mean_temp)
    const lower = temperature(values.p10_temp)
    const upper = temperature(values.p90_temp)
    if (lower !== null && upper !== null && lower > upper) throw new Error('Invalid ocean range')
    const available = coverage > 0 && count > 0
    return { mean: available ? mean : null, lower: available ? lower : null, upper: available ? upper : null }
  })
  return { fps, duration: frames.length / fps, frames }
}

export function getOceanFrame(data: OceanData, time: number, videoDuration: number): OceanFrame | null {
  if (!Number.isFinite(time) || time < 0 || time > data.duration || !Number.isFinite(videoDuration) || Math.abs(videoDuration - data.duration) > 1 / data.fps) return null
  return data.frames[Math.min(Math.floor(time * data.fps + 0.00001), data.frames.length - 1)] ?? null
}

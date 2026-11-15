export interface CarbonDioxideFrame {
  frameId: number
  mean: number | null
  lower: number | null
  upper: number | null
}

export interface CarbonDioxideData {
  fps: number
  duration: number
  frames: CarbonDioxideFrame[]
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid CO₂ data')
  return value as Record<string, unknown>
}

function positive(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) throw new Error('Invalid CO₂ timing')
  return value
}

function ppm(value: unknown): number | null {
  if (value === null) return null
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 380 || value > 460) throw new Error('Invalid CO₂ estimate')
  return value
}

export function parseCarbonDioxide(input: unknown): CarbonDioxideData {
  const data = record(input)
  const metadata = record(data.video_metadata)
  if (data.topic !== 'co2' || record(data.mapping).scientific_accuracy !== 'approximate_only' || !Array.isArray(data.frames)) throw new Error('Invalid CO₂ source')
  const fps = positive(metadata.fps)
  const duration = positive(metadata.video_duration_sec)
  if (!data.frames.length || data.frames.length !== metadata.processed_frame_count || Math.abs(data.frames.length / fps - duration) > 1 / fps) throw new Error('Incomplete CO₂ sequence')
  const frames = data.frames.map((value: unknown, index: number): CarbonDioxideFrame => {
    const frame = record(value)
    if (frame.frame_id !== index || typeof frame.video_time_sec !== 'number' || !Number.isFinite(frame.video_time_sec) || Math.abs(frame.video_time_sec - index / fps) > 0.001) throw new Error('Invalid CO₂ frame order')
    if (frame.quality !== 'approximate_visible_color_match' && frame.quality !== 'insufficient_matching_pixels') throw new Error('Invalid CO₂ quality')
    const mean = ppm(frame.co2_mean_ppm)
    const lower = ppm(frame.co2_min_ppm)
    const upper = ppm(frame.co2_max_ppm)
    if (lower !== null && upper !== null && lower > upper) throw new Error('Invalid CO₂ range')
    // Insufficient matches must never become a numeric estimate, even if a source includes numbers.
    const usable = frame.quality === 'approximate_visible_color_match'
    return { frameId: index, mean: usable ? mean : null, lower: usable ? lower : null, upper: usable ? upper : null }
  })
  return { fps, duration, frames }
}

export function getCarbonDioxideFrame(data: CarbonDioxideData, time: number, videoDuration: number): CarbonDioxideFrame | null {
  // The owner confirmed a common sequence. Reject incompatible timing rather than stretching it.
  if (!Number.isFinite(time) || time < 0 || time > data.duration || !Number.isFinite(videoDuration) || Math.abs(videoDuration - data.duration) > 1 / data.fps) return null
  return data.frames[Math.min(Math.floor(time * data.fps + 0.00001), data.frames.length - 1)] ?? null
}

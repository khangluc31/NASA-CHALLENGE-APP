export function getNightLightsBlend(value: number) {
  const year = Number.isFinite(value) ? Math.max(2012, Math.min(2023, value)) : 2012
  const lower = Math.floor(year) - 2012
  return { year, lower, upper: Math.min(11, lower + 1), blend: year - Math.floor(year) }
}

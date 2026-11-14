// Shared by the demo and future Sound integrations. Release on pause/end/unmount.
const owners = new Set<symbol>()
const listeners = new Set<() => void>()
export function claimForegroundAudio() {
  const owner = Symbol()
  owners.add(owner)
  listeners.forEach(listener => listener())
  return () => { owners.delete(owner); listeners.forEach(listener => listener()) }
}
export function subscribeForeground(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function hasForegroundAudio() { return owners.size > 0 }

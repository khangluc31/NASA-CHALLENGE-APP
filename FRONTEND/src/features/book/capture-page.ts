/** Freeze only DOM/2D pixels; never create a second React viewer or WebGL scene. */
export function capturePage(source: HTMLElement): HTMLElement {
  const copy = source.cloneNode(true)
  if (!(copy instanceof HTMLElement)) throw new Error('Expected a book page')
  const height = source.getBoundingClientRect().height
  if (height) copy.dataset.snapshotHeight = String(height)
  const originals = [source, ...source.querySelectorAll<HTMLElement>('*')]
  const copies = [copy, ...copy.querySelectorAll<HTMLElement>('*')]
  originals.forEach((element, index) => {
    const cloned = copies[index]
    cloned.removeAttribute('id')
    cloned.removeAttribute('autofocus')
    if (element.scrollTop) cloned.dataset.snapshotScroll = String(element.scrollTop)
    if (element instanceof HTMLCanvasElement && cloned instanceof HTMLCanvasElement) {
      // Copy before the outgoing viewer is disposed. WebGL hosts may need their
      // own preserved preview if their drawing buffer has already been cleared.
      try { cloned.getContext('2d')?.drawImage(element, 0, 0) } catch { /* Keep DOM fallback. */ }
    }
  })
  copy.inert = true
  return copy
}


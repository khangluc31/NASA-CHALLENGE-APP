/** Preparation and animation finish independently; loading is only a real wait. */
export async function waitForPageTurn(prepared: Promise<void>, flipped: Promise<void>, onWaiting: () => void): Promise<void> {
  const status: { settled: boolean } = { settled: false }
  // Observe rejection immediately, even when it happens before the animation.
  const result = prepared.then(
    () => { status.settled = true; return { ok: true as const } },
    (error: unknown) => { status.settled = true; return { ok: false as const, error } },
  )
  await flipped
  if (!status.settled) onWaiting()
  const outcome = await result
  if (!outcome.ok) throw outcome.error
}

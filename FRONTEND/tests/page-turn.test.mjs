import { test } from 'node:test'
import assert from 'node:assert/strict'
import { waitForPageTurn } from '../src/features/book/wait-for-page-turn.ts'

function deferred() {
  let resolve, reject
  const promise = new Promise((yes, no) => { resolve = yes; reject = no })
  return { promise, resolve, reject }
}
const tick = () => new Promise(resolve => setImmediate(resolve))

test('prepared chapter commits only after flip, without flashing loading', async () => {
  const flip = deferred()
  let committed = false
  let loading = 0
  const task = waitForPageTurn(Promise.resolve(), flip.promise, () => loading++)
    .then(() => { committed = true })
  await tick()
  assert.equal(committed, false)
  assert.equal(loading, 0)
  flip.resolve()
  await task
  assert.equal(committed, true)
  assert.equal(loading, 0)
})

test('slow dataset shows loading only after the flip and waits for data', async () => {
  const data = deferred(), flip = deferred()
  let loading = 0, committed = false
  const task = waitForPageTurn(data.promise, flip.promise, () => loading++)
    .then(() => { committed = true })
  await tick()
  assert.equal(loading, 0)
  flip.resolve()
  await tick()
  assert.equal(loading, 1)
  assert.equal(committed, false)
  data.resolve()
  await task
  assert.equal(committed, true)
})

test('early rejection is observed without cutting the flip short', async () => {
  const flip = deferred()
  const error = new Error('dataset unavailable')
  let loading = 0, failed = false
  const task = waitForPageTurn(Promise.reject(error), flip.promise, () => loading++)
  const checked = assert.rejects(task, error).then(() => { failed = true })
  await tick()
  assert.equal(failed, false)
  flip.resolve()
  await checked
  assert.equal(loading, 0)
})

test('late rejection leaves loading through the error path', async () => {
  const data = deferred()
  let loading = 0
  const task = waitForPageTurn(data.promise, Promise.resolve(), () => loading++)
  const checked = assert.rejects(task, /network/)
  await tick()
  assert.equal(loading, 1)
  data.reject(new Error('network'))
  await checked
})

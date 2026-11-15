import test from 'node:test'
import assert from 'node:assert/strict'
import { build } from 'rolldown'

// Exercise the supplied engine against a controlled audio clock; no speakers or browser needed.
const nodes = []
class AudioNode {
  volume = { value: 0 }
  frequency = { rampTo() {} }
  Q = { rampTo() {} }
  mute = false
  disposed = false
  constructor() { nodes.push(this) }
  toDestination() { return this }
  connect() { return this }
  set() {}
  releaseAll() {}
  triggerRelease() {}
  triggerAttackRelease() {}
  dispose() { this.disposed = true }
}
class Analyser extends AudioNode {
  constructor(type, size) { super(); this.values = new Float32Array(size).fill(type === 'fft' ? -50 : .1) }
  getValue() { return this.values }
}
const transport = { state: 'stopped', bpm: { value: 90 }, events: new Map(),
  scheduleRepeat(fn) { this.events.set(1, fn); return 1 }, clear(id) { this.events.delete(id) },
  start() { this.state = 'started' }, pause() { this.state = 'paused' }, stop() { this.state = 'stopped' },
}
let resolveStart
globalThis.__chapterTone = { Volume: AudioNode, Limiter: AudioNode, Reverb: AudioNode, Filter: AudioNode,
  PolySynth: AudioNode, FMSynth: AudioNode, NoiseSynth: AudioNode, Analyser, Transport: transport,
  Draw: { schedule() {} }, Frequency: () => ({ toFrequency: () => 440 }), now: () => 0,
  getContext: () => ({ sampleRate: 48000 }), start: () => new Promise(resolve => { resolveStart = resolve }),
}
const exports = Object.keys(globalThis.__chapterTone).map(key => `export const ${key} = globalThis.__chapterTone.${key};`).join('\n')
const bundle = await build({ input: new URL('../../../audio/engine.ts', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
  write: false, output: { format: 'esm' }, plugins: [{ name: 'controlled-audio',
    resolveId(id) { if (id === 'tone') return '\0controlled-tone' },
    load(id) { if (id === '\0controlled-tone') return exports },
  }],
})
const { AudioEngine } = await import(`data:text/javascript;base64,${Buffer.from(bundle.output[0].code).toString('base64')}`)
const features = { columns: [{ hue: 45, sat: .8, light: 1, edge: 0, rows: [{ hue: 45, light: 1 }] }] }

test('loading is lazy, and stop/dispose cancel a pending user-gesture start', async () => {
  for (const cancel of ['stop', 'dispose']) {
    const engine = new AudioEngine()
    const count = nodes.length
    engine.load(features)
    engine.setVolume(.2)
    assert.equal(nodes.length, count)
    const play = engine.play()
    engine[cancel]()
    resolveStart()
    await play
    assert.equal(nodes.length, count)
    assert.equal(transport.state, 'stopped')
    assert.equal(transport.events.size, 0)
  }
})

test('pause silences output; resume preserves progress; dispose clears scheduled work and nodes', async () => {
  const engine = new AudioEngine()
  engine.load(features)
  const playing = engine.play()
  resolveStart()
  await playing
  assert.equal(engine.playing, true)
  const output = nodes.find(node => node instanceof AudioNode && !(node instanceof Analyser))
  assert.equal(output.mute, false)
  assert.equal(engine.readAnalysis().fft.length, 1024)
  engine.pause()
  assert.equal(engine.playing, false)
  assert.equal(output.mute, true)
  const resume = engine.play()
  resolveStart()
  await resume
  assert.equal(output.mute, false)
  engine.dispose()
  assert.equal(output.mute, true)
  assert.equal(transport.events.size, 0)
  assert.ok(nodes.every(node => node.disposed))
})

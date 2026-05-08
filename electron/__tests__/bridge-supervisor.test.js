import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createSupervisor } = require('../services/bridgeSupervisor')

describe('bridgeSupervisor', () => {
  it('starts both bridges and waits for /health', async () => {
    const calls = []
    const fakeChild = () => ({ on() {}, kill() { this.killed = true }, killed: false })
    const sup = createSupervisor({
      spawnImpl: (cmd, args) => { calls.push({ cmd, args }); return fakeChild() },
      healthImpl: async (port) => ({ ok: true, port })
    })
    const result = await sup.start()
    expect(result.oi.ready).toBe(true)
    expect(result.uitars.ready).toBe(true)
    expect(calls).toHaveLength(2)
  })

  it('restarts a crashed bridge up to 3 times then marks failed', async () => {
    let attempts = 0
    const sup = createSupervisor({
      spawnImpl: () => ({ on() {}, kill() {}, killed: false }),
      healthImpl: async () => { attempts++; return { ok: false } }
    })
    const result = await sup.start({ healthTimeoutMs: 50, maxRestarts: 3 })
    expect(result.oi.ready).toBe(false)
    expect(result.oi.state).toBe('failed')
  })

  it('stop() kills both children', async () => {
    const children = []
    const sup = createSupervisor({
      spawnImpl: () => {
        const c = { on() {}, kill() { this.killed = true }, killed: false }
        children.push(c)
        return c
      },
      healthImpl: async () => ({ ok: true })
    })
    await sup.start()
    sup.stop()
    expect(children.every((c) => c.killed)).toBe(true)
  })
})

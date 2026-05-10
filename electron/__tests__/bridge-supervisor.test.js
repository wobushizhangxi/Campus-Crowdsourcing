import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'
import fs from 'fs'
import os from 'os'
import path from 'path'

const require = createRequire(import.meta.url)
const { createSupervisor } = require('../services/bridgeSupervisor')

describe('bridgeSupervisor', () => {
  it('starts all bridges and waits for /health', async () => {
    const calls = []
    const fakeChild = () => ({ on() {}, kill() { this.killed = true }, killed: false })
    const sup = createSupervisor({
      spawnImpl: (cmd, args, opts) => { calls.push({ cmd, args, env: opts.env }); return fakeChild() },
      healthImpl: async (port) => ({ ok: true, port })
    })
    const result = await sup.start()
    expect(result.uitars.ready).toBe(true)
    expect(result.browserUse.ready).toBe(true)
    expect(calls).toHaveLength(2)
    const uitars = calls.find((c) => c.args.some((arg) => arg.includes('uitars-bridge')))
    expect(uitars.env.UITARS_MODEL_PROVIDER).toBe('volcengine')
    expect(uitars.env.UITARS_MODEL_ENDPOINT).toContain('volces.com')
    const browserUse = calls.find((c) => c.cmd === 'python' && c.args.some((arg) => arg.includes('browser-use-bridge')))
    expect(browserUse).toBeDefined()
    expect(browserUse.env.BROWSER_USE_MODEL_ENDPOINT).toContain('volces.com')
    expect(browserUse.env.BROWSER_USE_MODEL_API_KEY).toBeDefined()
    expect(browserUse.env.BROWSER_USE_MODEL_NAME).toContain('doubao')
  })

  it('captures child stdout and stderr in bridge-specific log files', async () => {
    const seenStdio = []
    const sup = createSupervisor({
      spawnImpl: (_cmd, _args, opts) => {
        seenStdio.push(opts.stdio)
        if (Array.isArray(opts.stdio)) {
          for (const fd of opts.stdio.slice(1)) fs.closeSync(fd)
        }
        return { on() {}, kill() {}, killed: false }
      },
      healthImpl: async () => ({ ok: true })
    })

    await sup.start()

    expect(seenStdio).toHaveLength(2)
    expect(seenStdio.every((stdio) => Array.isArray(stdio) && stdio[0] === 'ignore')).toBe(true)
    for (const key of ['uitars', 'browserUse']) {
      expect(fs.existsSync(path.join(os.tmpdir(), 'aionui-logs', `${key}-stdout.log`))).toBe(true)
      expect(fs.existsSync(path.join(os.tmpdir(), 'aionui-logs', `${key}-stderr.log`))).toBe(true)
    }
  })

  it('restarts a crashed bridge up to 3 times then marks failed', async () => {
    let attempts = 0
    const sup = createSupervisor({
      spawnImpl: () => ({ on() {}, kill() {}, killed: false }),
      healthImpl: async () => { attempts++; return { ok: false } }
    })
    const result = await sup.start({ healthTimeoutMs: 50, maxRestarts: 3 })
    expect(result.uitars.ready).toBe(false)
    expect(result.uitars.state).toBe('failed')
  })

  it('stop() kills all children', async () => {
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
    expect(children).toHaveLength(2)
  })
})

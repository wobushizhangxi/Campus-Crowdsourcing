import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const request = require('supertest')
const { createApp } = require('../index')
const { createOiProcess } = require('../oiProcess')

describe('oi-bridge /health', () => {
  it('responds 200 with { ok: true, runtime: "open-interpreter" }', async () => {
    const app = createApp({ oiProcess: { isReady: () => true } })
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, runtime: 'open-interpreter', oiReady: true })
  })

  it('reports oiReady=false before OI server is up', async () => {
    const app = createApp({ oiProcess: { isReady: () => false } })
    const res = await request(app).get('/health')
    expect(res.body.oiReady).toBe(false)
  })
})

it('start() binds 127.0.0.1 only', async () => {
  const { start } = require('../index')
  const server = await start({ port: 0 })
  expect(server.address().address).toBe('127.0.0.1')
  await new Promise((r) => server.close(r))
})

describe('oi-bridge oiProcess', () => {
  it('isReady() is false before ensure()', () => {
    const p = createOiProcess({ command: 'echo', port: 0, spawnImpl: () => fakeChild() })
    expect(p.isReady()).toBe(false)
  })

  it('ensure() spawns interpreter --server once and resolves when /heartbeat returns', async () => {
    let spawnCalls = 0
    const p = createOiProcess({
      command: 'fake-interpreter',
      port: 12345,
      spawnImpl: (cmd, args) => {
        spawnCalls++
        expect(cmd).toBe('fake-interpreter')
        expect(args).toEqual(['--server', '--port', '12345'])
        return fakeChild()
      },
      heartbeatImpl: async () => true
    })
    await p.ensure()
    await p.ensure()
    expect(spawnCalls).toBe(1)
    expect(p.isReady()).toBe(true)
  })

  it('stop() kills the child', async () => {
    const child = fakeChild()
    const p = createOiProcess({ command: 'x', port: 0, spawnImpl: () => child, heartbeatImpl: async () => true })
    await p.ensure()
    p.stop()
    expect(child.killed).toBe(true)
  })
})

function fakeChild() {
  return {
    killed: false,
    kill() { this.killed = true },
    on() {}
  }
}

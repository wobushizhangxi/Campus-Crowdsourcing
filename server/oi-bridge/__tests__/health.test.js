import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const request = require('supertest')
const { createApp } = require('../index')

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

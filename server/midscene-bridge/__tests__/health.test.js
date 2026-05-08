import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const request = require('supertest')
const { createApp, start } = require('../index')

describe('midscene-bridge /health', () => {
  it('responds 200 with bridge readiness and extension state', async () => {
    const app = createApp({ bridge: { ready: () => true, extensionConnected: () => true } })
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      ok: true,
      runtime: 'midscene',
      bridgeReady: true,
      extensionConnected: true
    })
  })

  it('reports false state before bridge and extension are ready', async () => {
    const app = createApp({ bridge: { ready: () => false, extensionConnected: () => false } })
    const res = await request(app).get('/health')
    expect(res.body.bridgeReady).toBe(false)
    expect(res.body.extensionConnected).toBe(false)
  })

  it('start binds 127.0.0.1 only', async () => {
    const server = await start({ port: 0 })
    expect(server.address().address).toBe('127.0.0.1')
    await new Promise((resolve) => server.close(resolve))
  })
})

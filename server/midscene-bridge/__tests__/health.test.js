import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const request = require('supertest')
const { createApp, start } = require('../index')
const { createBridgeMode } = require('../bridgeMode')

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

  it('reports extensionConnected=true after probe succeeds', async () => {
    let probeCalled = 0
    let optionsSeen = null
    const fakeAgent = {
      connectCurrentTab: async (options) => {
        probeCalled += 1
        optionsSeen = options
      }
    }
    const bridge = createBridgeMode({
      endpoint: 'http://x',
      apiKey: 'k',
      model: 'qwen3-vl-plus',
      probeTimeoutMs: 25,
      factory: () => fakeAgent
    })

    bridge.start()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(probeCalled).toBe(1)
    expect(optionsSeen).toEqual({ forceSameTabNavigation: true, timeoutMs: 25 })
    expect(bridge.extensionConnected()).toBe(true)
    await bridge.destroy()
  })

  it('reports extensionConnected=false when probe rejects', async () => {
    const fakeAgent = {
      connectCurrentTab: async () => {
        throw new Error('not listening')
      }
    }
    const bridge = createBridgeMode({
      endpoint: 'http://x',
      apiKey: 'k',
      model: 'qwen3-vl-plus',
      factory: () => fakeAgent
    })

    bridge.start()
    await new Promise((resolve) => setTimeout(resolve, 50))

    expect(bridge.extensionConnected()).toBe(false)
    await bridge.destroy()
  })

  it('probe times out quickly when connectCurrentTab hangs', async () => {
    let destroyCalled = 0
    const fakeAgent = {
      connectCurrentTab: () => new Promise(() => {}),
      destroy: async () => {
        destroyCalled += 1
      }
    }
    const bridge = createBridgeMode({
      endpoint: 'http://x',
      apiKey: 'k',
      model: 'qwen3-vl-plus',
      probeTimeoutMs: 20,
      probeIntervalMs: 100,
      factory: () => fakeAgent
    })

    bridge.start()
    await new Promise((resolve) => setTimeout(resolve, 60))

    expect(bridge.extensionConnected()).toBe(false)
    expect(destroyCalled).toBeGreaterThanOrEqual(1)
    await bridge.destroy()
  })
})

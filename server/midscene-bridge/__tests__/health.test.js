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
    const fakeAgent = {
      getBrowserTabList: async () => { probeCalled += 1; return [] },
      connectCurrentTab: async () => {}
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

    expect(probeCalled).toBeGreaterThanOrEqual(1)
    expect(bridge.extensionConnected()).toBe(true)
    await bridge.destroy()
  })

  it('reports extensionConnected=false when probe rejects', async () => {
    const fakeAgent = {
      getBrowserTabList: async () => { throw new Error('not listening') }
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

  it('probe times out quickly when getBrowserTabList hangs and does NOT destroy on initial failure', async () => {
    let destroyCalled = 0
    const fakeAgent = {
      getBrowserTabList: () => new Promise(() => {}),
      destroy: async () => { destroyCalled += 1 }
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
    // Initial-failure path must NOT destroy the agent — that would close the
    // BridgeServer and kick a (possibly imminent) extension connection.
    expect(destroyCalled).toBe(0)
    await bridge.destroy()
  })

  it('recreates agent only when probe fails AFTER previously being connected (disconnect detection)', async () => {
    let probeCount = 0
    let destroyCalled = 0
    const factory = () => ({
      getBrowserTabList: async () => {
        probeCount += 1
        if (probeCount === 1) return []         // first probe: success → bridgeReady=true
        throw new Error('extension stopped')     // second probe: failure → must recreate
      },
      destroy: async () => { destroyCalled += 1 }
    })

    const bridge = createBridgeMode({
      endpoint: 'http://x',
      apiKey: 'k',
      model: 'qwen3-vl-plus',
      probeTimeoutMs: 20,
      probeIntervalMs: 30,
      factory
    })

    bridge.start()
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(bridge.extensionConnected()).toBe(false)
    expect(destroyCalled).toBeGreaterThanOrEqual(1)
    await bridge.destroy()
  })
})

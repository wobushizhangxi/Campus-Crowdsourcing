import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createMidsceneAdapter } = require('../services/midscene/adapter')

const stubStore = (cfg) => ({ getConfig: () => ({ midsceneEndpoint: 'http://127.0.0.1:8770', ...cfg }) })
const approvedAction = (extra) => ({
  id: 'a1',
  sessionId: 's1',
  runtime: 'midscene',
  status: 'approved',
  createdAt: new Date().toISOString(),
  ...extra
})

describe('midscene adapter', () => {
  beforeEach(() => { vi.stubGlobal('fetch', vi.fn()) })
  afterEach(() => vi.restoreAllMocks())

  it('returns ok when bridge responds 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ ok: true, stdout: 'clicked' }) })))
    const adapter = createMidsceneAdapter({ storeRef: stubStore({}) })
    const res = await adapter.execute(approvedAction({ type: 'web.click', payload: { target: 'OK' } }))
    expect(res.ok).toBe(true)
    expect(res.stdout).toBe('clicked')
  })

  it('marks recoverable when bridge offline', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw Object.assign(new Error('ECONNREFUSED'), { code: 'ECONNREFUSED' }) }))
    const adapter = createMidsceneAdapter({ storeRef: stubStore({}) })
    const res = await adapter.execute(approvedAction({ type: 'web.click', payload: { target: 'OK' } }))
    expect(res.ok).toBe(false)
    expect(res.metadata?.recoverable).toBe(true)
  })

  it('marks recoverable when bridge returns 5xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 503, text: async () => 'unavailable' })))
    const adapter = createMidsceneAdapter({ storeRef: stubStore({}) })
    const res = await adapter.execute(approvedAction({ type: 'web.click', payload: { target: 'OK' } }))
    expect(res.ok).toBe(false)
    expect(res.metadata?.recoverable).toBe(true)
    expect(res.metadata?.status).toBe(503)
  })

  it('rejects unsupported runtime', async () => {
    const adapter = createMidsceneAdapter({ storeRef: stubStore({}) })
    await expect(adapter.execute({ ...approvedAction({ type: 'web.click' }), runtime: 'open-interpreter' })).rejects.toThrow()
  })
})

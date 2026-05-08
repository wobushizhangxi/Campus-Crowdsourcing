import { test, expect, vi, afterEach } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createUiTarsAdapter } = require('../services/uiTars/adapter')
const { toUiTarsRequest } = require('../services/uiTars/protocol')

afterEach(() => vi.restoreAllMocks())

const action = {
  id: 'act1',
  sessionId: 'sess1',
  runtime: 'ui-tars',
  type: 'mouse.click',
  title: 'Click',
  payload: { x: 10, y: 20 },
  status: 'approved',
  createdAt: '2026-05-08T00:00:00.000Z'
}

const stubStore = (config) => ({ getConfig: () => config })
const approvedAction = (overrides = {}) => ({ ...action, status: 'approved', ...overrides })

test('builds UI-TARS protocol requests for visual/input actions', () => {
  const request = toUiTarsRequest(action)
  expect(request.protocol).toBe('aionui.ui-tars.v1')
  expect(request.payload).toEqual({ x: 10, y: 20 })
})

test('does not execute without screen authorization', async () => {
  const adapter = createUiTarsAdapter({ storeRef: { getConfig: () => ({ uiTarsEndpoint: 'http://127.0.0.1:8765', uiTarsScreenAuthorized: false }) } })
  const result = await adapter.execute(action)
  expect(result.ok).toBe(false)
  expect(result.metadata.requiresScreenAuthorization).toBe(true)
})

test('returns recoverable result when authorized but runtime missing', async () => {
  const adapter = createUiTarsAdapter({ storeRef: { getConfig: () => ({ uiTarsScreenAuthorized: true }) } })
  const result = await adapter.execute({ ...action, type: 'screen.observe', payload: {} })
  expect(result.ok).toBe(false)
  expect(result.metadata.recoverable).toBe(true)
})

test('posts authorized actions to source bridge endpoint', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, stdout: 'clicked', metadata: { screenshot: 'screen.png' } }) }))
  vi.stubGlobal('fetch', fetchMock)
  const adapter = createUiTarsAdapter({ storeRef: { getConfig: () => ({ uiTarsEndpoint: 'http://127.0.0.1:8765', uiTarsScreenAuthorized: true }) } })
  const result = await adapter.execute(action)
  expect(result.ok).toBe(true)
  expect(result.stdout).toBe('clicked')
  expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8765/execute', expect.objectContaining({ method: 'POST' }))
})

test('returns success when bridge responds 200 with normalized result', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, exitCode: 0, stdout: 'ok' })
  })))
  const adapter = createUiTarsAdapter({ storeRef: stubStore({ uiTarsEndpoint: 'http://127.0.0.1:8765', uiTarsScreenAuthorized: true }) })
  const result = await adapter.execute(approvedAction({ type: 'screen.observe', payload: {} }))
  expect(result.ok).toBe(true)
  expect(result.stdout).toBe('ok')
})

test('returns recoverable when bridge is offline', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
  }))
  const adapter = createUiTarsAdapter({ storeRef: stubStore({ uiTarsEndpoint: 'http://127.0.0.1:8765', uiTarsScreenAuthorized: true }) })
  const result = await adapter.execute(approvedAction({ type: 'screen.observe', payload: {} }))
  expect(result.ok).toBe(false)
  expect(result.metadata?.recoverable).toBe(true)
})

test('returns recoverable when bridge returns 5xx', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: false,
    status: 503,
    text: async () => 'unavailable'
  })))
  const adapter = createUiTarsAdapter({ storeRef: stubStore({ uiTarsEndpoint: 'http://127.0.0.1:8765', uiTarsScreenAuthorized: true }) })
  const result = await adapter.execute(approvedAction({ type: 'screen.observe', payload: {} }))
  expect(result.ok).toBe(false)
  expect(result.metadata?.recoverable).toBe(true)
  expect(result.metadata?.status).toBe(503)
})

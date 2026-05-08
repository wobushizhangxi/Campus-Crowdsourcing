import { test, expect, vi, afterEach } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createOpenInterpreterAdapter } = require('../services/openInterpreter/adapter')
const { toSidecarRequest } = require('../services/openInterpreter/protocol')

afterEach(() => vi.restoreAllMocks())

const action = {
  id: 'act1',
  sessionId: 'sess1',
  runtime: 'open-interpreter',
  type: 'shell.command',
  title: 'Run tests',
  payload: { command: 'npm test' },
  status: 'approved',
  createdAt: '2026-05-08T00:00:00.000Z'
}

const stubStore = (config) => ({ getConfig: () => config })
const approvedAction = (overrides = {}) => ({ ...action, status: 'approved', ...overrides })

test('builds sidecar protocol requests only for supported actions', () => {
  const request = toSidecarRequest(action)
  expect(request.protocol).toBe('aionui.open-interpreter.v1')
  expect(request.approved).toBe(true)
  expect(() => toSidecarRequest({ ...action, type: 'mouse.click' })).toThrow(/不支持/)
})

test('returns recoverable result when runtime is missing', async () => {
  const adapter = createOpenInterpreterAdapter({ storeRef: { getConfig: () => ({}) } })
  const result = await adapter.execute(action)
  expect(result.ok).toBe(false)
  expect(result.metadata.recoverable).toBe(true)
  expect(result.metadata.guidance.proposedSetupActions[0].requiresConfirmation).toBe(true)
})

test('posts approved actions to configured endpoint', async () => {
  const fetchMock = vi.fn(async () => ({ ok: true, json: async () => ({ ok: true, stdout: 'done', durationMs: 5 }) }))
  vi.stubGlobal('fetch', fetchMock)
  const adapter = createOpenInterpreterAdapter({ storeRef: { getConfig: () => ({ openInterpreterEndpoint: 'http://127.0.0.1:8756' }) } })
  const result = await adapter.execute(action)
  expect(result.ok).toBe(true)
  expect(result.stdout).toBe('done')
  expect(fetchMock).toHaveBeenCalledWith('http://127.0.0.1:8756/execute', expect.objectContaining({ method: 'POST' }))
})

test('returns success when bridge responds 200 with normalized result', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ ok: true, exitCode: 0, stdout: 'ok' })
  })))
  const adapter = createOpenInterpreterAdapter({ storeRef: stubStore({ openInterpreterEndpoint: 'http://127.0.0.1:8756' }) })
  const result = await adapter.execute(approvedAction({ type: 'shell.command', payload: { command: 'echo' } }))
  expect(result.ok).toBe(true)
  expect(result.stdout).toBe('ok')
})

test('returns recoverable when bridge is offline', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => {
    throw Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' })
  }))
  const adapter = createOpenInterpreterAdapter({ storeRef: stubStore({ openInterpreterEndpoint: 'http://127.0.0.1:8756' }) })
  const result = await adapter.execute(approvedAction({ type: 'shell.command', payload: { command: 'echo' } }))
  expect(result.ok).toBe(false)
  expect(result.metadata?.recoverable).toBe(true)
})

test('returns recoverable when bridge returns 5xx', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: false,
    status: 503,
    text: async () => 'unavailable'
  })))
  const adapter = createOpenInterpreterAdapter({ storeRef: stubStore({ openInterpreterEndpoint: 'http://127.0.0.1:8756' }) })
  const result = await adapter.execute(approvedAction({ type: 'shell.command', payload: { command: 'echo' } }))
  expect(result.ok).toBe(false)
  expect(result.metadata?.recoverable).toBe(true)
  expect(result.metadata?.status).toBe(503)
})

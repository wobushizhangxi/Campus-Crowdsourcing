import { test, expect, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Mock global fetch
global.fetch = vi.fn()

const { healthCheck, execute, parseSSE } = require('../services/browserUse/adapter')

test('healthCheck returns available when bridge responds ok', async () => {
  fetch.mockResolvedValueOnce({
    json: async () => ({ ok: true, runtime: 'browser-use', version: '0.1.0', ready: true }),
  })

  const result = await healthCheck()
  expect(result.available).toBe(true)
  expect(result.detail.runtime).toBe('browser-use')
})

test('healthCheck returns unavailable on fetch error', async () => {
  fetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

  const result = await healthCheck()
  expect(result.available).toBe(false)
})

test('parseSSE extracts events from SSE stream', () => {
  const text = [
    'event: start',
    'data: {"goal":"test"}',
    '',
    'event: result',
    'data: {"success":true,"summary":"done"}',
    '',
    'event: done',
    'data: {"duration_ms":1000}',
    '',
  ].join('\n')

  const events = parseSSE(text)
  expect(events).toHaveLength(3)
  expect(events[0]).toEqual({ type: 'start', data: { goal: 'test' } })
  expect(events[1]).toEqual({ type: 'result', data: { success: true, summary: 'done' } })
  expect(events[2]).toEqual({ type: 'done', data: { duration_ms: 1000 } })
})

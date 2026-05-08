import { test, expect, vi, afterEach } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { detect, getSetupGuide } = require('../services/midscene/bootstrap')

afterEach(() => vi.restoreAllMocks())

test('detect reports configured when bridge health says extension connected', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, runtime: 'midscene', extensionConnected: true })
  })))
  const status = await detect({})
  expect(status.runtime).toBe('midscene')
  expect(status.state).toBe('configured')
  expect(status.endpoint).toBe('http://127.0.0.1:8770')
  expect(status.extensionConnected).toBe(true)
})

test('detect reports needs-extension when bridge is up but extension is not connected', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, runtime: 'midscene', extensionConnected: false })
  })))
  const status = await detect({})
  expect(status.state).toBe('needs-extension')
  expect(status.extensionConnected).toBe(false)
})

test('detect reports not-installed when bridge is offline', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('ECONNREFUSED') }))
  const status = await detect({})
  expect(status.state).toBe('not-installed')
  expect(status.extensionConnected).toBe(false)
})

test('setup guide documents manual Chrome extension step', () => {
  const guide = getSetupGuide({})
  expect(guide.steps.join(' ')).toContain('Chrome')
  expect(guide.steps.join(' ')).toContain('manual')
})

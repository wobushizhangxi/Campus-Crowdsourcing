import { afterEach, describe, it, expect, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { computeSetupStatus, register } = require('../ipc/setupStatus')
const { store } = require('../store')

describe('setup-status', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('reports lite tier ready when only DeepSeek key set', async () => {
    const fakeStore = { getConfig: () => ({ deepseekApiKey: 'k', qwenVisionApiKey: '', doubaoVisionApiKey: '', uiTarsScreenAuthorized: false }) }
    const fakeBootstraps = {
      midscene: { detect: async () => ({ extensionConnected: false }) },
      openInterpreter: { detect: async () => ({ state: 'not-installed', oiReady: false }) },
      uiTars: { detect: async () => ({ screenAuthorized: false }) }
    }
    const status = await computeSetupStatus({ storeRef: fakeStore, bootstraps: fakeBootstraps })
    expect(status.tiers.lite.ready).toBe(true)
    expect(status.tiers.browser.ready).toBe(false)
    expect(status.tiers.full.ready).toBe(false)
    expect(status.deps.deepseekKey).toBe(true)
    expect(status.deps.midsceneExtension).toBe(false)
  })

  it('returns verified help links and omits screen authorization URL', async () => {
    const fakeStore = { getConfig: () => ({ deepseekApiKey: '', qwenVisionApiKey: '', doubaoVisionApiKey: '', uiTarsScreenAuthorized: false }) }
    const fakeBootstraps = {
      midscene: { detect: async () => ({ extensionConnected: false }) },
      openInterpreter: { detect: async () => ({ state: 'not-installed', oiReady: false }) },
      uiTars: { detect: async () => ({ screenAuthorized: false }) }
    }
    const status = await computeSetupStatus({ storeRef: fakeStore, bootstraps: fakeBootstraps })
    expect(status.helpLinks).toEqual({
      deepseekKey: 'https://platform.deepseek.com/api_keys',
      qwenKey: 'https://bailian.console.aliyun.com/?apiKey=1#/api-key',
      doubaoKey: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
      midsceneExtension: 'https://chromewebstore.google.com/detail/midscene/gbldofcpkknbggpkmbdaefngejllnief',
      pythonOpenInterpreter: 'https://docs.openinterpreter.com/getting-started/setup'
    })
  })

  it('reports browser tier ready when Qwen key and extension are connected', async () => {
    const fakeStore = { getConfig: () => ({ deepseekApiKey: 'k', qwenVisionApiKey: 'q', doubaoVisionApiKey: '', uiTarsScreenAuthorized: false }) }
    const fakeBootstraps = {
      midscene: { detect: async () => ({ extensionConnected: true }) },
      openInterpreter: { detect: async () => ({ oiReady: false }) },
      uiTars: { detect: async () => ({ screenAuthorized: false }) }
    }
    const status = await computeSetupStatus({ storeRef: fakeStore, bootstraps: fakeBootstraps })
    expect(status.tiers.browser.ready).toBe(true)
    expect(status.tiers.full.ready).toBe(false)
  })

  it('reports full tier ready only when all deps are green', async () => {
    const fakeStore = { getConfig: () => ({ deepseekApiKey: 'k', qwenVisionApiKey: 'q', doubaoVisionApiKey: 'd', uiTarsScreenAuthorized: true }) }
    const fakeBootstraps = {
      midscene: { detect: async () => ({ extensionConnected: true }) },
      openInterpreter: { detect: async () => ({ oiReady: true }) },
      uiTars: { detect: async () => ({ screenAuthorized: true }) }
    }
    const status = await computeSetupStatus({ storeRef: fakeStore, bootstraps: fakeBootstraps })
    expect(status.tiers.full.ready).toBe(true)
  })

  it('registers status and welcome visibility handlers', () => {
    const handlers = new Map()
    register({ handle: (channel, handler) => handlers.set(channel, handler) })
    expect([...handlers.keys()]).toEqual(expect.arrayContaining([
      'setup:status',
      'setup:get-welcome-shown',
      'setup:mark-welcome-shown',
      'setup:set-key',
      'setup:set-screen-authorized'
    ]))
  })

  it('setup:set-key updates the matching store field', () => {
    const handlers = new Map()
    const setConfig = vi.spyOn(store, 'setConfig').mockImplementation((patch) => patch)
    register({ handle: (channel, handler) => handlers.set(channel, handler) })

    expect(handlers.get('setup:set-key')({}, { dep: 'deepseekKey', value: '  sk-test  ' })).toEqual({ ok: true })
    expect(setConfig).toHaveBeenCalledWith({ deepseekApiKey: 'sk-test' })
  })

  it('setup:set-key rejects unknown dep', () => {
    const handlers = new Map()
    vi.spyOn(store, 'setConfig').mockImplementation((patch) => patch)
    register({ handle: (channel, handler) => handlers.set(channel, handler) })

    expect(() => handlers.get('setup:set-key')({}, { dep: 'foo', value: 'sk-test' })).toThrow(/Unknown dep/)
  })

  it('setup:set-key rejects non-string and oversized values', () => {
    const handlers = new Map()
    vi.spyOn(store, 'setConfig').mockImplementation((patch) => patch)
    register({ handle: (channel, handler) => handlers.set(channel, handler) })

    expect(() => handlers.get('setup:set-key')({}, { dep: 'qwenKey', value: 123 })).toThrow(/invalid key/)
    expect(() => handlers.get('setup:set-key')({}, { dep: 'qwenKey', value: 'x'.repeat(4097) })).toThrow(/invalid key/)
  })

  it('setup:set-screen-authorized stores a boolean value', () => {
    const handlers = new Map()
    const setConfig = vi.spyOn(store, 'setConfig').mockImplementation((patch) => patch)
    register({ handle: (channel, handler) => handlers.set(channel, handler) })

    expect(handlers.get('setup:set-screen-authorized')({}, { value: 'yes' })).toEqual({ ok: true })
    expect(setConfig).toHaveBeenCalledWith({ uiTarsScreenAuthorized: true })
  })
})

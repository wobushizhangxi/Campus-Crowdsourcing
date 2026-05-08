import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { computeSetupStatus, register } = require('../ipc/setupStatus')

describe('setup-status', () => {
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
      'setup:mark-welcome-shown'
    ]))
  })
})

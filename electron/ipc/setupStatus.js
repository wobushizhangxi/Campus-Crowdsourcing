const { store } = require('../store')
const oiBootstrap = require('../services/openInterpreter/bootstrap')
const uiTarsBootstrap = require('../services/uiTars/bootstrap')

const KEY_FIELD_MAP = {
  deepseekKey: 'deepseekApiKey',
  qwenKey: 'qwenVisionApiKey',
  doubaoKey: 'doubaoVisionApiKey'
}

async function computeSetupStatus({ storeRef = store, bootstraps = {} } = {}) {
  const cfg = storeRef.getConfig()
  const oi = bootstraps.openInterpreter || oiBootstrap
  const ut = bootstraps.uiTars || uiTarsBootstrap

  const [oiStatus, utStatus] = await Promise.all([
    oi.detect(cfg).catch(() => ({})),
    ut.detect(cfg).catch(() => ({}))
  ])

  const deps = {
    deepseekKey: Boolean(cfg.deepseekApiKey),
    qwenKey: Boolean(cfg.qwenVisionApiKey),
    doubaoKey: Boolean(cfg.doubaoVisionApiKey),
    pythonOpenInterpreter: Boolean(oiStatus.oiReady || oiStatus.state === 'configured'),
    screenAuthorized: Boolean(utStatus.screenAuthorized || cfg.uiTarsScreenAuthorized)
  }

  const tiers = {
    lite: {
      label: 'Lite: chat only',
      requires: ['deepseekKey'],
      ready: deps.deepseekKey
    },
    browser: {
      label: 'Browser automation',
      requires: ['deepseekKey', 'qwenKey'],
      ready: deps.deepseekKey && deps.qwenKey,
      recommended: true
    },
    full: {
      label: 'Full desktop and local execution',
      requires: ['deepseekKey', 'qwenKey', 'doubaoKey', 'pythonOpenInterpreter', 'screenAuthorized'],
      ready: deps.deepseekKey && deps.qwenKey && deps.doubaoKey && deps.pythonOpenInterpreter && deps.screenAuthorized
    }
  }

  return {
    deps,
    tiers,
    helpLinks: {
      deepseekKey: 'https://platform.deepseek.com/api_keys',
      qwenKey: 'https://bailian.console.aliyun.com/?apiKey=1#/api-key',
      doubaoKey: 'https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey',
      pythonOpenInterpreter: 'https://docs.openinterpreter.com/getting-started/setup'
    }
  }
}

function register(ipcMain) {
  ipcMain.handle('setup:status', async () => computeSetupStatus())
  ipcMain.handle('setup:get-welcome-shown', () => Boolean(store.getConfig().welcomeShown))
  ipcMain.handle('setup:mark-welcome-shown', () => {
    store.setConfig({ welcomeShown: true })
    return true
  })
  ipcMain.handle('setup:set-key', (_evt, { dep, value } = {}) => {
    const field = KEY_FIELD_MAP[dep]
    if (!field) throw new Error(`Unknown dep ${dep}`)
    if (typeof value !== 'string' || value.length > 4096) throw new Error('invalid key')
    store.setConfig({ [field]: value.trim() })
    return { ok: true }
  })
  ipcMain.handle('setup:set-screen-authorized', (_evt, { value } = {}) => {
    store.setConfig({ uiTarsScreenAuthorized: Boolean(value) })
    return { ok: true }
  })
}

module.exports = { register, computeSetupStatus }

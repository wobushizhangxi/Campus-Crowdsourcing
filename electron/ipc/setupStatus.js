const { store } = require('../store')
const midsceneBootstrap = require('../services/midscene/bootstrap')
const oiBootstrap = require('../services/openInterpreter/bootstrap')
const uiTarsBootstrap = require('../services/uiTars/bootstrap')

const KEY_FIELD_MAP = {
  deepseekKey: 'deepseekApiKey',
  qwenKey: 'qwenVisionApiKey',
  doubaoKey: 'doubaoVisionApiKey'
}

async function computeSetupStatus({ storeRef = store, bootstraps = {} } = {}) {
  const cfg = storeRef.getConfig()
  const ms = bootstraps.midscene || midsceneBootstrap
  const oi = bootstraps.openInterpreter || oiBootstrap
  const ut = bootstraps.uiTars || uiTarsBootstrap

  const [msStatus, oiStatus, utStatus] = await Promise.all([
    ms.detect(cfg).catch(() => ({})),
    oi.detect(cfg).catch(() => ({})),
    ut.detect(cfg).catch(() => ({}))
  ])

  const deps = {
    deepseekKey: Boolean(cfg.deepseekApiKey),
    qwenKey: Boolean(cfg.qwenVisionApiKey),
    doubaoKey: Boolean(cfg.doubaoVisionApiKey),
    midsceneExtension: Boolean(msStatus.extensionConnected),
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
      requires: ['deepseekKey', 'qwenKey', 'midsceneExtension'],
      ready: deps.deepseekKey && deps.qwenKey && deps.midsceneExtension,
      recommended: true
    },
    full: {
      label: 'Full desktop and local execution',
      requires: ['deepseekKey', 'qwenKey', 'midsceneExtension', 'doubaoKey', 'pythonOpenInterpreter', 'screenAuthorized'],
      ready: deps.deepseekKey && deps.qwenKey && deps.midsceneExtension && deps.doubaoKey && deps.pythonOpenInterpreter && deps.screenAuthorized
    }
  }

  return {
    deps,
    tiers,
    helpLinks: {
      deepseekKey: 'https://platform.deepseek.com',
      qwenKey: 'https://dashscope.console.aliyun.com',
      doubaoKey: 'https://console.volcengine.com/ark',
      midsceneExtension: 'https://midscenejs.com/docs/extension',
      pythonOpenInterpreter: 'https://docs.openinterpreter.com/getting-started/setup',
      screenAuthorized: 'aionui://settings#screen-authorization'
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

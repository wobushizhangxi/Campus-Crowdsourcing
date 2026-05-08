const { store } = require('../../store')

const BRIDGE_ENDPOINT = 'http://127.0.0.1:8770'

function getFetch() {
  return global.fetch || ((...a) => import('node-fetch').then(({ default: f }) => f(...a)))
}

function getSetupGuide() {
  return {
    runtime: 'midscene',
    status: 'needs-verification',
    title: 'Configure Midscene Bridge Mode',
    steps: [
      'Install Google Chrome.',
      'Install the Midscene browser extension manually; AionUi never auto-installs browser extensions.',
      'Click Allow Bridge Connection in the extension.',
      'Configure qwenVisionApiKey for Qwen3-VL on DashScope.',
      'Run a web.observe smoke test before web.click or web.type.'
    ],
    proposedSetupActions: [{
      runtime: 'midscene',
      type: 'runtime.setup',
      title: 'Open Midscene setup guide',
      summary: 'Shows the manual Chrome extension and Qwen3-VL setup steps.',
      payload: { guide: 'https://midscenejs.com/docs/extension' },
      risk: 'medium',
      requiresConfirmation: true
    }]
  }
}

function notInstalled(config = store.getConfig()) {
  return {
    runtime: 'midscene',
    state: 'not-installed',
    endpoint: BRIDGE_ENDPOINT,
    extensionConnected: false,
    guidance: getSetupGuide(config)
  }
}

async function detect(config = store.getConfig()) {
  try {
    const r = await getFetch()(`${BRIDGE_ENDPOINT}/health`)
    if (!r.ok) return notInstalled(config)
    const data = await r.json().catch(() => ({}))
    const extensionConnected = Boolean(data.extensionConnected)
    return {
      runtime: 'midscene',
      state: extensionConnected ? 'configured' : 'needs-extension',
      endpoint: BRIDGE_ENDPOINT,
      extensionConnected,
      guidance: getSetupGuide(config)
    }
  } catch {
    return notInstalled(config)
  }
}

async function repair(config = store.getConfig()) {
  const status = await detect(config)
  return { ...status, repaired: false, message: 'Install the Midscene Chrome extension manually and allow bridge connection.' }
}

module.exports = { detect, repair, getSetupGuide, notInstalled }

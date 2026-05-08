function createBridgeMode(opts = {}) {
  let agent = null
  let bridgeReady = false
  let tabAttached = false
  let probeTimer = null
  let probeInFlight = null
  const probeIntervalMs = opts.probeIntervalMs ?? 3000
  const probeTimeoutMs = opts.probeTimeoutMs ?? 1500

  const factory = opts.factory || (() => {
    const { AgentOverChromeBridge, overrideAIConfig } = require('@midscene/web/bridge-mode')
    if (typeof overrideAIConfig === 'function') {
      overrideAIConfig({
        OPENAI_BASE_URL: opts.endpoint,
        OPENAI_API_KEY: opts.apiKey,
        MIDSCENE_MODEL_NAME: opts.model,
        MIDSCENE_USE_QWEN_VL: 'true',
        MIDSCENE_USE_DOUBAO_VISION: '',
        MIDSCENE_USE_GEMINI: '',
        MIDSCENE_USE_VLM_UI_TARS: '',
        MIDSCENE_USE_VL_MODEL: ''
      }, true)
    }
    return new AgentOverChromeBridge({
      serverListeningTimeout: opts.serverListeningTimeout ?? false,
      closeNewTabsAfterDisconnect: false,
      modelConfig: {
        endpoint: opts.endpoint,
        apiKey: opts.apiKey,
        model: opts.model
      }
    })
  })

  function ensure() {
    if (!agent) agent = factory()
    return agent
  }

  function ready() {
    return Boolean(opts.endpoint && opts.apiKey && opts.model)
  }

  function withTimeout(promise, timeoutMs) {
    let timeoutId = null
    const timeout = new Promise((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error('Midscene bridge probe timed out')), timeoutMs)
    })
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timeoutId))
  }

  async function recreateAgent() {
    const current = agent
    agent = null
    bridgeReady = false
    tabAttached = false
    if (current && typeof current.destroy === 'function') {
      try { await current.destroy() } catch { /* best effort */ }
    }
  }

  async function runProbe() {
    if (!ready()) { bridgeReady = false; return false }
    let usedAgent = null
    try {
      usedAgent = ensure()
      if (typeof usedAgent.getBrowserTabList !== 'function') {
        bridgeReady = false
        return false
      }
      await withTimeout(usedAgent.getBrowserTabList(), probeTimeoutMs)
      bridgeReady = true
      return true
    } catch {
      const wasReady = bridgeReady
      bridgeReady = false
      tabAttached = false
      if (wasReady) {
        await recreateAgent()
      }
      return false
    }
  }

  function probeOnce() {
    if (!probeInFlight) {
      probeInFlight = runProbe().finally(() => { probeInFlight = null })
    }
    return probeInFlight
  }

  function startProbeLoop() {
    if (probeTimer) return
    probeOnce()
    probeTimer = setInterval(() => { probeOnce() }, probeIntervalMs)
  }

  function stopProbeLoop() {
    if (!probeTimer) return
    clearInterval(probeTimer)
    probeTimer = null
  }

  async function ensureConnected() {
    if (!bridgeReady) await probeOnce()
    if (!bridgeReady) throw new Error('Midscene extension not connected — open the extension and switch to Bridge Mode')
    const current = ensure()
    if (!tabAttached) {
      await current.connectCurrentTab({ forceSameTabNavigation: true })
      tabAttached = true
    }
    return current
  }

  return {
    start: startProbeLoop,
    stop: stopProbeLoop,
    ready,
    extensionConnected: () => bridgeReady,
    probeOnce,
    ensureConnected,
    async screenshotPage() {
      const current = await ensureConnected()
      if (typeof current.screenshotPage === 'function') return current.screenshotPage()
      if (current.page && typeof current.page.screenshotBase64 === 'function') {
        return Buffer.from(await current.page.screenshotBase64(), 'base64')
      }
      throw new Error('Midscene bridge does not expose screenshotBase64')
    },
    async aiAction(instruction) {
      const current = await ensureConnected()
      return current.aiAction(instruction)
    },
    async aiInput(text, locatePrompt = 'the active input field') {
      const current = await ensureConnected()
      return current.aiInput(text, locatePrompt)
    },
    async aiQuery(question) {
      const current = await ensureConnected()
      return current.aiQuery(question)
    },
    async destroy() {
      stopProbeLoop()
      await recreateAgent()
    }
  }
}

module.exports = { createBridgeMode }

function createBridgeMode(opts = {}) {
  let agent = null
  let connected = false
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

  async function ensureConnected() {
    const current = ensure()
    if (!connected && typeof current.connectCurrentTab === 'function') {
      await current.connectCurrentTab({ forceSameTabNavigation: true })
    }
    connected = true
    return current
  }

  return {
    ready: () => Boolean(opts.endpoint && opts.apiKey && opts.model),
    extensionConnected: () => {
      try {
        const current = ensure()
        if (typeof current.isConnected === 'function') return Boolean(current.isConnected())
        if (typeof current.connected === 'boolean') return current.connected
        return connected
      } catch {
        return false
      }
    },
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
      if (agent && typeof agent.destroy === 'function') {
        await agent.destroy()
      }
      agent = null
      connected = false
    }
  }
}

module.exports = { createBridgeMode }

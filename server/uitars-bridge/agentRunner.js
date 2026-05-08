function createAgentRunner(opts = {}) {
  const screenshotImpl = opts.screenshotImpl || (async () => {
    const screenshot = require('screenshot-desktop')
    return await screenshot()
  })
  const modelConfig = {
    modelProvider: opts.modelProvider,
    modelEndpoint: opts.modelEndpoint,
    modelApiKey: opts.modelApiKey,
    modelName: opts.modelName,
    provider: opts.modelProvider,
    endpoint: opts.modelEndpoint,
    name: opts.modelName,
    baseURL: opts.modelEndpoint,
    apiKey: opts.modelApiKey,
    model: opts.modelName
  }
  const guiAgentFactory = opts.guiAgentFactory || ((cfg) => {
    const { GUIAgent } = require('@ui-tars/sdk')
    return new GUIAgent({ model: cfg })
  })
  const nutjs = opts.nutjs || require('@nut-tree-fork/nut-js')

  let agent = null
  function getAgent() {
    if (!agent) agent = guiAgentFactory(modelConfig)
    return agent
  }

  return {
    ready: () => Boolean((opts.modelEndpoint && opts.modelName) || opts.guiAgentFactory),
    async screenshot() {
      return await screenshotImpl()
    },
    async semanticClick(instruction) {
      const png = await screenshotImpl()
      const result = await getAgent().runOnce({ instruction, screenshot: png })
      const target = result?.action?.target || result?.target
      if (!target || typeof target.x !== 'number' || typeof target.y !== 'number') {
        return { ok: false, reason: 'model returned no coordinates', raw: result }
      }
      await nutjs.mouse.move(nutjs.straightTo(new nutjs.Point(target.x, target.y)))
      await nutjs.mouse.leftClick()
      return { ok: true, x: target.x, y: target.y, instruction }
    },
    async type(text) {
      await nutjs.keyboard.type(String(text))
      return { ok: true, typed: text }
    }
  }
}

module.exports = { createAgentRunner }

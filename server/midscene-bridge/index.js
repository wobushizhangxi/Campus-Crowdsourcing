const express = require('express')
const { classify } = require('./translator')

function normalize(raw = {}) {
  const ok = raw.ok !== false
  return {
    ok,
    exitCode: ok ? 0 : 1,
    stdout: String(raw.stdout || ''),
    stderr: String(raw.stderr || ''),
    filesChanged: [],
    durationMs: Number(raw.durationMs) || 0,
    completedAt: new Date().toISOString(),
    metadata: raw.metadata || {}
  }
}

function createApp(deps = {}) {
  const bridge = deps.bridge || { ready: () => false, extensionConnected: () => false }
  const app = express()
  app.use(express.json({ limit: '20mb' }))

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      runtime: 'midscene',
      bridgeReady: Boolean(bridge.ready()),
      extensionConnected: Boolean(bridge.extensionConnected())
    })
  })

  app.post('/execute', async (req, res) => {
    const action = req.body || {}
    if (!action.approved) {
      return res.status(403).json(normalize({ ok: false, stderr: 'action not approved' }))
    }
    const plan = classify(action)
    try {
      if (plan.backend === 'not-implemented') {
        return res.json(normalize({
          ok: false,
          stderr: plan.reason,
          metadata: { notImplemented: true, reason: plan.reason }
        }))
      }
      if (plan.backend === 'navigate') {
        const r = await bridge.navigate(plan.url)
        return res.json(normalize({ ok: r.ok !== false, stdout: `已导航到 ${r.url}`, metadata: { url: r.url } }))
      }
      if (plan.backend === 'screenshot-page') {
        const buf = await bridge.screenshotPage()
        return res.json(normalize({
          ok: true,
          metadata: { screenshotBase64: Buffer.from(buf).toString('base64'), mime: 'image/png' }
        }))
      }
      if (plan.backend === 'ai-action') {
        const result = await bridge.aiAction(plan.instruction)
        return res.json(normalize({ ok: result.ok !== false, stderr: result.reason, metadata: result }))
      }
      if (plan.backend === 'ai-input') {
        const result = await bridge.aiInput(plan.text)
        return res.json(normalize({ ok: result.ok !== false, metadata: result }))
      }
      if (plan.backend === 'ai-query') {
        const result = await bridge.aiQuery(plan.question)
        return res.json(normalize({
          ok: result.ok !== false,
          stdout: String(result.answer || ''),
          metadata: result
        }))
      }
      return res.json(normalize({ ok: false, stderr: plan.reason || 'unknown' }))
    } catch (err) {
      return res.json(normalize({ ok: false, stderr: String(err.message || err) }))
    }
  })

  return app
}

function start({ port = 8770, host = '127.0.0.1' } = {}) {
  const deps = wireDefaultBridge()
  const app = createApp(deps)
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => resolve(server))
    server.on('close', () => {
      const cleanup = deps.bridge?.destroy?.() || deps.bridge?.stop?.()
      if (cleanup && typeof cleanup.catch === 'function') cleanup.catch(() => {})
    })
  })
}

function wireDefaultBridge() {
  const { createBridgeMode } = require('./bridgeMode')
  const provider = process.env.MIDSCENE_VISION_PROVIDER || 'qwen'
  const useDoubao = provider === 'doubao'
  const endpoint = useDoubao
    ? (process.env.MIDSCENE_VISION_ENDPOINT || process.env.MIDSCENE_QWEN_ENDPOINT)
    : (process.env.MIDSCENE_QWEN_ENDPOINT || process.env.MIDSCENE_VISION_ENDPOINT)
  const apiKey = useDoubao
    ? (process.env.MIDSCENE_VISION_API_KEY || process.env.MIDSCENE_QWEN_API_KEY)
    : (process.env.MIDSCENE_QWEN_API_KEY || process.env.MIDSCENE_VISION_API_KEY)
  const model = useDoubao
    ? (process.env.MIDSCENE_VISION_MODEL || 'doubao-1-5-thinking-vision-pro-250428')
    : (process.env.MIDSCENE_QWEN_MODEL || 'qwen3-vl-plus')
  const bridge = createBridgeMode({
    visionProvider: provider,
    endpoint,
    apiKey,
    model
  })
  bridge.start()
  return { bridge }
}

if (require.main === module) {
  const portArg = process.argv.indexOf('--port')
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8770
  start({ port }).then((server) => {
    process.stdout.write(`midscene-bridge listening on 127.0.0.1:${server.address().port}\n`)
    const shutdown = () => server.close(() => process.exit(0))
    process.once('SIGINT', shutdown)
    process.once('SIGTERM', shutdown)
  })
}

module.exports = { createApp, start, wireDefaultBridge }

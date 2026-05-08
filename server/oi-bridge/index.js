const express = require('express')
const fs = require('fs/promises')
const fetchImpl = global.fetch || require('node-fetch')
const { createOiProcess } = require('./oiProcess')
const { classify, normalizeResult } = require('./translator')

async function defaultOiChat(endpoint, message) {
  const start = Date.now()
  const r = await fetchImpl(`${endpoint.replace(/\/+$/, '')}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, auto_run: true })
  })
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    return { ok: false, exitCode: 1, stderr: `OI server ${r.status}: ${text.slice(0, 200)}`, durationMs: Date.now() - start }
  }
  const data = await r.json().catch(() => ({}))
  return {
    ok: true,
    exitCode: 0,
    stdout: typeof data.output === 'string' ? data.output : JSON.stringify(data),
    durationMs: Date.now() - start,
    metadata: data.parserFallback ? { parserFallback: true } : {}
  }
}

function createApp(deps = {}) {
  const oiProcess = deps.oiProcess || createOiProcess()
  const oiChat = deps.oiChatImpl || defaultOiChat
  const app = express()
  app.use(express.json({ limit: '10mb' }))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, runtime: 'open-interpreter', oiReady: Boolean(oiProcess.isReady()) })
  })

  app.post('/execute', async (req, res) => {
    const action = req.body || {}
    if (!action.approved) return res.status(403).json(normalizeResult({ ok: false, stderr: 'action not approved' }))
    const plan = classify(action)
    try {
      if (plan.backend === 'not-implemented') {
        return res.json(normalizeResult({ ok: false, stderr: plan.reason, metadata: { notImplemented: true, reason: plan.reason } }))
      }
      if (plan.backend === 'fs') {
        if (plan.op === 'read') {
          const buf = await fs.readFile(plan.path, 'utf8')
          return res.json(normalizeResult({ ok: true, stdout: buf, exitCode: 0 }))
        }
        if (plan.op === 'write') {
          await fs.writeFile(plan.path, plan.content, 'utf8')
          return res.json(normalizeResult({ ok: true, stdout: '', exitCode: 0, filesChanged: [plan.path] }))
        }
      }
      if (plan.backend === 'oi-chat') {
        await oiProcess.ensure()
        const out = await oiChat(oiProcess.endpoint(), plan.message)
        return res.json(normalizeResult(out))
      }
      return res.json(normalizeResult({ ok: false, stderr: plan.reason || 'unknown backend' }))
    } catch (err) {
      return res.json(normalizeResult({ ok: false, stderr: String(err.message || err) }))
    }
  })

  app.post('/stop', (_req, res) => res.json({ ok: true }))

  return app
}

function start({ port = 8756, host = '127.0.0.1' } = {}) {
  const app = createApp()
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => resolve(server))
  })
}

if (require.main === module) {
  const portArg = process.argv.indexOf('--port')
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8756
  start({ port }).then((s) => {
    process.stdout.write(`oi-bridge listening on 127.0.0.1:${s.address().port}\n`)
  })
}

module.exports = { createApp, start }

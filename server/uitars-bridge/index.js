const express = require('express')

function createApp(deps = {}) {
  const agentRunner = deps.agentRunner || { ready: () => false }
  const app = express()
  app.use(express.json({ limit: '20mb' }))

  app.get('/health', (_req, res) => {
    res.json({ ok: true, runtime: 'ui-tars', agentReady: Boolean(agentRunner.ready()) })
  })

  return app
}

function start({ port = 8765, host = '127.0.0.1' } = {}) {
  const app = createApp()
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => resolve(server))
  })
}

if (require.main === module) {
  const portArg = process.argv.indexOf('--port')
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8765
  start({ port }).then((s) => process.stdout.write(`uitars-bridge listening on 127.0.0.1:${s.address().port}\n`))
}

module.exports = { createApp, start }

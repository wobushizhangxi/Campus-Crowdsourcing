const express = require('express')

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

  return app
}

function start({ port = 8770, host = '127.0.0.1' } = {}) {
  const app = createApp()
  return new Promise((resolve) => {
    const server = app.listen(port, host, () => resolve(server))
  })
}

if (require.main === module) {
  const portArg = process.argv.indexOf('--port')
  const port = portArg >= 0 ? Number(process.argv[portArg + 1]) : 8770
  start({ port }).then((server) => {
    process.stdout.write(`midscene-bridge listening on 127.0.0.1:${server.address().port}\n`)
  })
}

module.exports = { createApp, start }

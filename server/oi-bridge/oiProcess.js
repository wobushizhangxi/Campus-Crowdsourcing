const { spawn: realSpawn } = require('child_process')
const fetchImpl = global.fetch || require('node-fetch')

function createOiProcess(opts = {}) {
  const command = opts.command || 'interpreter'
  const port = opts.port ?? 8757
  const host = opts.host || '127.0.0.1'
  const spawnImpl = opts.spawnImpl || realSpawn
  const heartbeatImpl = opts.heartbeatImpl || (async () => {
    try {
      const r = await fetchImpl(`http://${host}:${port}/heartbeat`)
      return r.ok
    } catch {
      return false
    }
  })

  let child = null
  let ready = false
  let starting = null

  async function ensure() {
    if (ready) return
    if (starting) return starting
    starting = (async () => {
      child = spawnImpl(command, ['--server', '--port', String(port)], { stdio: 'ignore' })
      child.on('exit', () => {
        ready = false
        child = null
      })
      const deadline = Date.now() + 30_000
      while (Date.now() < deadline) {
        if (await heartbeatImpl()) {
          ready = true
          return
        }
        await new Promise((r) => setTimeout(r, 500))
      }
      throw new Error('interpreter --server did not become ready within 30s')
    })().finally(() => {
      starting = null
    })
    return starting
  }

  function stop() {
    if (child && !child.killed) child.kill()
    child = null
    ready = false
  }

  return {
    ensure,
    stop,
    isReady: () => ready,
    endpoint: () => `http://${host}:${port}`
  }
}

module.exports = { createOiProcess }

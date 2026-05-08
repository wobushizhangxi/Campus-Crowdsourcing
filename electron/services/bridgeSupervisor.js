const { spawn: realSpawn } = require('child_process')
const path = require('path')
const fetchImpl = global.fetch || ((...a) => import('node-fetch').then(({ default: f }) => f(...a)))

const DEFAULTS = {
  oi: { name: 'oi-bridge', port: 8756, dir: 'server/oi-bridge' },
  uitars: { name: 'uitars-bridge', port: 8765, dir: 'server/uitars-bridge' }
}

function resolveDefaultRootDir() {
  const devRoot = path.join(__dirname, '..', '..')
  return process.defaultApp ? devRoot : (process.resourcesPath || devRoot)
}

function createSupervisor(opts = {}) {
  const spawnImpl = opts.spawnImpl || realSpawn
  const healthImpl = opts.healthImpl || (async (port) => {
    try {
      const r = await fetchImpl(`http://127.0.0.1:${port}/health`)
      return { ok: r.ok }
    } catch {
      return { ok: false }
    }
  })
  const rootDir = opts.rootDir || resolveDefaultRootDir()

  const state = {
    oi: { ready: false, state: 'pending', child: null, restarts: 0 },
    uitars: { ready: false, state: 'pending', child: null, restarts: 0 }
  }

  async function startOne(key, { healthTimeoutMs = 5000, maxRestarts = 3 } = {}) {
    const cfg = DEFAULTS[key]
    state[key].state = 'starting'
    state[key].child = spawnImpl('node', [path.join(rootDir, cfg.dir, 'index.js'), '--port', String(cfg.port)], { stdio: 'ignore' })
    const deadline = Date.now() + healthTimeoutMs
    while (Date.now() < deadline) {
      const h = await healthImpl(cfg.port)
      if (h.ok) {
        state[key].ready = true
        state[key].state = 'running'
        return state[key]
      }
      await new Promise((r) => setTimeout(r, 250))
    }
    state[key].ready = false
    if (state[key].restarts < maxRestarts) {
      state[key].restarts++
      return startOne(key, { healthTimeoutMs, maxRestarts })
    }
    state[key].state = 'failed'
    return state[key]
  }

  async function start(options = {}) {
    await Promise.all([startOne('oi', options), startOne('uitars', options)])
    return { oi: { ...state.oi }, uitars: { ...state.uitars } }
  }

  function stop() {
    for (const k of Object.keys(state)) {
      const c = state[k].child
      if (c && !c.killed) c.kill()
      state[k].child = null
      state[k].ready = false
      state[k].state = 'stopped'
    }
  }

  return { start, stop, getState: () => ({ oi: { ...state.oi }, uitars: { ...state.uitars } }) }
}

module.exports = { createSupervisor }

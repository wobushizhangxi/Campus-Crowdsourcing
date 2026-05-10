const { spawn: realSpawn } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const fetchImpl = global.fetch || ((...a) => import('node-fetch').then(({ default: f }) => f(...a)))

const DEFAULTS = {
  uitars: { name: 'uitars-bridge', port: 8765, dir: 'server/uitars-bridge' },
  browserUse: { name: 'browser-use-bridge', port: 8780, dir: 'server/browser-use-bridge', runtime: 'python' }
}

function resolveDefaultRootDir() {
  const devRoot = path.join(__dirname, '..', '..')
  return process.defaultApp ? devRoot : (process.resourcesPath || devRoot)
}

function buildStdio(key) {
  const logDir = path.join(os.tmpdir(), 'aionui-logs')
  fs.mkdirSync(logDir, { recursive: true })
  const out = fs.openSync(path.join(logDir, `${key}-stdout.log`), 'a')
  const err = fs.openSync(path.join(logDir, `${key}-stderr.log`), 'a')
  return ['ignore', out, err]
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

  const state = Object.fromEntries(
    Object.keys(DEFAULTS).map((key) => [key, { ready: false, state: 'pending', child: null, restarts: 0 }])
  )

  function buildEnv(key) {
    const config = require('../store').store.getConfig()
    const env = { ...process.env }
    if (key === 'uitars') {
      env.UITARS_MODEL_PROVIDER = 'volcengine'
      env.UITARS_MODEL_ENDPOINT = config.doubaoVisionEndpoint || ''
      env.UITARS_MODEL_API_KEY = config.doubaoVisionApiKey || ''
      env.UITARS_MODEL_NAME = config.doubaoVisionModel || ''
    }
    if (key === 'browserUse') {
      env.BROWSER_USE_MODEL_ENDPOINT = config.doubaoVisionEndpoint || ''
      env.BROWSER_USE_MODEL_API_KEY = config.doubaoVisionApiKey || ''
      env.BROWSER_USE_MODEL_NAME = config.doubaoVisionModel || 'doubao-seed-1-6-vision-250815'
    }
    return env
  }

  function snapshot() {
    return Object.fromEntries(Object.keys(state).map((key) => [key, { ...state[key] }]))
  }

  async function startOne(key, { healthTimeoutMs = 5000, maxRestarts = 3 } = {}) {
    const cfg = DEFAULTS[key]
    const spawnOptions = { stdio: buildStdio(key), env: buildEnv(key) }
    state[key].state = 'starting'
    const runtime = cfg.runtime || 'node'
    const child = runtime === 'python'
      ? spawnImpl('python', ['-u', path.join(rootDir, cfg.dir, 'main.py'), String(cfg.port)], spawnOptions)
      : spawnImpl('node', [path.join(rootDir, cfg.dir, 'index.js'), '--port', String(cfg.port)], spawnOptions)
    state[key].child = child
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
    await Promise.all(Object.keys(DEFAULTS).map((key) => startOne(key, options)))
    return snapshot()
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

  return { start, stop, getState: snapshot }
}

module.exports = { createSupervisor }

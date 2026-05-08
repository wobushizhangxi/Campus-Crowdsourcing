const { store } = require('../../store')
const { RUNTIME_NAMES } = require('../../security/actionTypes')
const { toMidsceneRequest, normalizeMidsceneResult } = require('./protocol')

function getFetch() {
  return typeof fetch === 'function' ? fetch : null
}

function recoverable(action, reason, extra = {}) {
  return normalizeMidsceneResult(action, {
    ok: false,
    exitCode: 1,
    stderr: reason,
    metadata: { recoverable: true, ...extra }
  })
}

function createMidsceneAdapter(options = {}) {
  const storeRef = options.storeRef || store

  return {
    async execute(action, context = {}) {
      const config = storeRef.getConfig()
      if (action.runtime !== RUNTIME_NAMES.MIDSCENE && action.runtime !== RUNTIME_NAMES.DRY_RUN) {
        throw new Error(`Midscene adapter cannot execute runtime ${action.runtime}`)
      }
      const endpoint = config.midsceneEndpoint || 'http://127.0.0.1:8770'
      const fetchImpl = getFetch()
      if (!fetchImpl) return recoverable(action, 'fetch is not available')

      const request = toMidsceneRequest(action)
      try {
        const resp = await fetchImpl(endpoint.replace(/\/+$/, '') + '/execute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(request),
          signal: context.signal
        })
        if (!resp.ok) {
          const text = await resp.text().catch(() => '')
          return recoverable(action, `Midscene bridge returned ${resp.status}: ${text.slice(0, 200)}`, { status: resp.status })
        }
        return normalizeMidsceneResult(action, await resp.json())
      } catch (err) {
        return recoverable(action, `Midscene bridge unavailable: ${err.message || err}`, { code: err.code || 'FETCH_FAILED' })
      }
    },
    emergencyStop() {
      return { ok: true, runtime: 'midscene' }
    }
  }
}

module.exports = { createMidsceneAdapter, recoverable }

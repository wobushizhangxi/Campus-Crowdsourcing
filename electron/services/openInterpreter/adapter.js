const { store } = require('../../store')
const { RUNTIME_NAMES } = require('../../security/actionTypes')
const { detect, getInstallGuidance } = require('./bootstrap')
const { toSidecarRequest, normalizeSidecarResult } = require('./protocol')

function getFetch() {
  if (typeof fetch === 'function') return fetch
  return null
}

function recoverableMissing(action, config) {
  return normalizeSidecarResult(action, {
    ok: false,
    exitCode: 1,
    stdout: 'Open Interpreter is not configured. No local command, file, or code action was executed.',
    stderr: '',
    metadata: {
      recoverable: true,
      guidance: getInstallGuidance(config)
    }
  })
}

async function executeViaEndpoint(endpoint, request, signal) {
  const fetchImpl = getFetch()
  if (!fetchImpl) throw new Error('fetch is not available for the Open Interpreter sidecar endpoint')
  let resp
  try {
    resp = await fetchImpl(endpoint.replace(/\/+$/, '') + '/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal
    })
  } catch (error) {
    return {
      ok: false,
      exitCode: 1,
      stderr: `Open Interpreter sidecar unavailable: ${error.message || error}`,
      metadata: { recoverable: true, code: error.code || 'FETCH_FAILED' }
    }
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    return {
      ok: false,
      exitCode: 1,
      stderr: `Open Interpreter sidecar returned ${resp.status}: ${text.slice(0, 200)}`,
      metadata: { recoverable: true, status: resp.status }
    }
  }
  return resp.json()
}

function createOpenInterpreterAdapter(options = {}) {
  const storeRef = options.storeRef || store

  return {
    async execute(action, context = {}) {
      const config = storeRef.getConfig()
      if (action.runtime !== RUNTIME_NAMES.OPEN_INTERPRETER && action.runtime !== RUNTIME_NAMES.DRY_RUN) {
        throw new Error(`Open Interpreter adapter cannot execute runtime ${action.runtime}`)
      }
      const runtime = await detect(config)
      const request = toSidecarRequest(action)
      if (!config.openInterpreterEndpoint && !config.openInterpreterCommand) return recoverableMissing(action, config)
      if (config.openInterpreterEndpoint) {
        const result = await executeViaEndpoint(config.openInterpreterEndpoint, request, context.signal)
        return normalizeSidecarResult(action, result)
      }
      return normalizeSidecarResult(action, {
        ok: false,
        exitCode: 1,
        stdout: `Open Interpreter command is configured (${config.openInterpreterCommand}), but no protocol sidecar endpoint is available.`,
        metadata: { recoverable: true, runtime }
      })
    },
    emergencyStop() {
      return { ok: true, runtime: 'open-interpreter' }
    }
  }
}

module.exports = { createOpenInterpreterAdapter, recoverableMissing }

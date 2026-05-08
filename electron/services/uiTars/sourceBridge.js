const { toUiTarsRequest, normalizeUiTarsResult } = require('./protocol')

function getFetch() {
  if (typeof fetch === 'function') return fetch
  return null
}

async function executeThroughBridge(endpoint, action, context = {}) {
  const fetchImpl = getFetch()
  if (!fetchImpl) throw new Error('fetch is not available for the UI-TARS bridge service')
  const request = toUiTarsRequest(action)
  let resp
  try {
    resp = await fetchImpl(endpoint.replace(/\/+$/, '') + '/execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: context.signal
    })
  } catch (error) {
    return normalizeUiTarsResult(action, {
      ok: false,
      exitCode: 1,
      stderr: `UI-TARS bridge unavailable: ${error.message || error}`,
      metadata: { recoverable: true, code: error.code || 'FETCH_FAILED' }
    })
  }
  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    return normalizeUiTarsResult(action, {
      ok: false,
      exitCode: 1,
      stderr: `UI-TARS bridge returned ${resp.status}: ${text.slice(0, 200)}`,
      metadata: { recoverable: true, status: resp.status }
    })
  }
  return normalizeUiTarsResult(action, await resp.json())
}

module.exports = { executeThroughBridge }

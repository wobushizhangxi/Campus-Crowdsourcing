const { ACTION_TYPES, RUNTIME_NAMES } = require('../../security/actionTypes')

const SUPPORTED_ACTION_TYPES = Object.freeze([
  ACTION_TYPES.WEB_NAVIGATE,
  ACTION_TYPES.WEB_OBSERVE,
  ACTION_TYPES.WEB_CLICK,
  ACTION_TYPES.WEB_TYPE,
  ACTION_TYPES.WEB_QUERY
])

function toMidsceneRequest(action) {
  if (action.runtime !== RUNTIME_NAMES.MIDSCENE && action.runtime !== RUNTIME_NAMES.DRY_RUN) {
    throw new Error(`Midscene adapter cannot execute runtime ${action.runtime}`)
  }
  if (!SUPPORTED_ACTION_TYPES.includes(action.type)) {
    throw new Error(`Midscene adapter does not support ${action.type}`)
  }
  return {
    protocol: 'aionui.midscene.v1',
    actionId: action.id,
    sessionId: action.sessionId,
    type: action.type,
    payload: action.payload || {},
    approved: action.status === 'approved' || action.status === 'running',
    createdAt: action.createdAt
  }
}

function normalizeMidsceneResult(action, result = {}) {
  return {
    actionId: action.id,
    ok: result.ok !== false,
    exitCode: Number.isInteger(result.exitCode) ? result.exitCode : (result.ok === false ? 1 : 0),
    stdout: String(result.stdout || ''),
    stderr: String(result.stderr || ''),
    filesChanged: Array.isArray(result.filesChanged) ? result.filesChanged : [],
    durationMs: Number.isFinite(result.durationMs) ? result.durationMs : 0,
    completedAt: result.completedAt || new Date().toISOString(),
    metadata: result.metadata || {}
  }
}

module.exports = { SUPPORTED_ACTION_TYPES, toMidsceneRequest, normalizeMidsceneResult }

const NOT_IMPLEMENTED = new Set(['file.delete', 'runtime.setup'])

function classify(action) {
  if (NOT_IMPLEMENTED.has(action.type)) {
    return { backend: 'not-implemented', reason: `${action.type} not in v1 scope` }
  }
  if (action.type === 'shell.command') {
    return {
      backend: 'oi-chat',
      message: `Run this shell command: ${String(action.payload?.command || '')}`,
      autoRun: true
    }
  }
  if (action.type === 'code.execute') {
    const lang = String(action.payload?.language || 'python')
    const code = String(action.payload?.code || '')
    return {
      backend: 'oi-chat',
      message: `Execute the following ${lang} code:\n\`\`\`${lang}\n${code}\n\`\`\``,
      autoRun: true
    }
  }
  if (action.type === 'file.read') {
    return { backend: 'fs', op: 'read', path: String(action.payload?.path || '') }
  }
  if (action.type === 'file.write') {
    return {
      backend: 'fs',
      op: 'write',
      path: String(action.payload?.path || ''),
      content: String(action.payload?.content ?? '')
    }
  }
  return { backend: 'unknown', reason: `Unsupported action type ${action.type}` }
}

function normalizeResult(raw = {}) {
  const ok = raw.ok !== false
  return {
    ok,
    exitCode: Number.isInteger(raw.exitCode) ? raw.exitCode : (ok ? 0 : 1),
    stdout: String(raw.stdout || ''),
    stderr: String(raw.stderr || ''),
    filesChanged: Array.isArray(raw.filesChanged) ? raw.filesChanged : [],
    durationMs: Number.isFinite(raw.durationMs) ? raw.durationMs : 0,
    completedAt: raw.completedAt || new Date().toISOString(),
    metadata: raw.metadata || {}
  }
}

module.exports = { classify, normalizeResult }

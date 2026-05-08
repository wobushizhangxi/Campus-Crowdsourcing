const NOT_IMPLEMENTED = new Set(['web.scroll', 'web.hover', 'web.assert', 'web.wait'])

function classify(action = {}) {
  if (NOT_IMPLEMENTED.has(action.type)) {
    return { backend: 'not-implemented', reason: `${action.type} not in v1` }
  }
  if (action.type === 'web.observe') {
    return { backend: 'screenshot-page' }
  }
  if (action.type === 'web.click') {
    return { backend: 'ai-action', instruction: `Click: ${String(action.payload?.target || '')}` }
  }
  if (action.type === 'web.type') {
    return { backend: 'ai-input', text: String(action.payload?.text ?? '') }
  }
  if (action.type === 'web.query') {
    return { backend: 'ai-query', question: String(action.payload?.question ?? '') }
  }
  return { backend: 'unknown', reason: `Unsupported ${action.type}` }
}

module.exports = { classify }

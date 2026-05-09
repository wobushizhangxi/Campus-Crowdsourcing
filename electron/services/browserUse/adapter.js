const PORT = 8780

function endpoint() {
  return `http://127.0.0.1:${PORT}`
}

async function healthCheck() {
  try {
    const resp = await fetch(`${endpoint()}/health`, { signal: AbortSignal.timeout(3000) })
    const data = await resp.json()
    return { available: data.ok === true && data.ready === true, detail: data }
  } catch {
    return { available: false, detail: { ok: false } }
  }
}

async function execute(action, context = {}) {
  const { goal, max_steps = 15, start_url, headless = true } = action.payload || action

  const resp = await fetch(`${endpoint()}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ goal, max_steps, start_url, headless }),
    signal: context.signal,
  })

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    return { ok: false, error: { code: 'BRIDGE_ERROR', message: `browser-use bridge ${resp.status}: ${text.slice(0, 200)}` } }
  }

  // Read SSE stream
  const text = await resp.text()
  const events = parseSSE(text)

  const resultEvent = events.find(e => e.type === 'result')
  if (resultEvent) {
    return {
      ok: resultEvent.data?.success !== false,
      summary: resultEvent.data?.summary || '',
      final_url: resultEvent.data?.final_url || '',
      steps_completed: resultEvent.data?.steps_completed || 0,
      duration_ms: resultEvent.data?.duration_ms || 0,
      error: resultEvent.data?.error,
    }
  }

  return { ok: false, error: { code: 'NO_RESULT', message: 'browser-use 未返回结果事件。' } }
}

async function cancel() {
  try {
    await fetch(`${endpoint()}/cancel`, { method: 'POST' })
  } catch { /* bridge may already be down */ }
}

function parseSSE(text) {
  const events = []
  let currentType = ''
  let currentData = ''

  for (const line of text.split('\n')) {
    if (line.startsWith('event: ')) {
      currentType = line.slice(7).trim()
      currentData = ''
    } else if (line.startsWith('data: ')) {
      currentData += line.slice(6)
    } else if (line === '' && currentType) {
      try {
        events.push({ type: currentType, data: JSON.parse(currentData) })
      } catch {
        events.push({ type: currentType, data: currentData })
      }
      currentType = ''
      currentData = ''
    }
  }

  return events
}

module.exports = { healthCheck, execute, cancel, endpoint, PORT, parseSSE }

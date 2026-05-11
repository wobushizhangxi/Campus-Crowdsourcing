const { store } = require('../store')

class DoubaoError extends Error {
  constructor(code, message, status) {
    super(message)
    this.code = code
    this.status = status
  }
}

function getFetch() {
  if (typeof fetch === 'function') return fetch
  throw new DoubaoError('DOUBAO_RUNTIME', '当前运行时无法使用全局 fetch。')
}

function mapErrorCode(status) {
  if (status === 401 || status === 403) return 'DOUBAO_AUTH'
  if (status === 429) return 'DOUBAO_RATE_LIMIT'
  if (status >= 500) return 'DOUBAO_SERVER'
  return 'DOUBAO_UNKNOWN'
}

function parseToolArgs(raw) {
  if (!raw) return {}
  if (typeof raw === 'object') return raw
  try { return JSON.parse(raw) } catch { return {} }
}

function stringifyToolArgs(raw) {
  if (typeof raw === 'string') return raw
  if (raw && typeof raw === 'object') return JSON.stringify(raw)
  return '{}'
}

function normalizeAssistantToolCalls(toolCalls = []) {
  return toolCalls.map((call, index) => {
    const name = call.function?.name || call.name
    if (!name) return null
    return {
      id: call.id || `call_${index}`,
      type: call.type || 'function',
      function: {
        name,
        arguments: stringifyToolArgs(call.function?.arguments ?? call.args)
      }
    }
  }).filter(Boolean)
}

function normalizeToolCalls(toolCalls = []) {
  return normalizeAssistantToolCalls(toolCalls).map((call) => ({
    id: call.id,
    name: call.function.name,
    args: parseToolArgs(call.function.arguments)
  }))
}

async function chat({ messages, model: modelOverride, tools, signal }) {
  const config = store.getConfig()
  const apiKey = config.doubaoVisionApiKey
  if (!apiKey) throw new DoubaoError('DOUBAO_AUTH', '尚未配置豆包 API Key。')

  const endpoint = (config.doubaoVisionEndpoint || 'https://ark.cn-beijing.volces.com/api/v3').replace(/\/+$/, '')
  const model = modelOverride || config.doubaoVisionModel || 'doubao-seed-1-6-vision-250815'

  const body = {
    model,
    messages,
    temperature: 0.7,
    stream: false,
    ...(tools && tools.length ? { tools } : {})
  }

  const timeoutSignal = AbortSignal.timeout(60000)
  const effectiveSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

  let resp
  try {
    resp = await getFetch()(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: effectiveSignal
    })
  } catch (error) {
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      if (signal?.aborted) throw error
      throw new DoubaoError('DOUBAO_TIMEOUT', '豆包模型响应超时。')
    }
    throw new DoubaoError('DOUBAO_NETWORK', `网络错误：${error.message}`)
  }

  if (!resp.ok) {
    const text = await resp.text().catch(() => '')
    throw new DoubaoError(mapErrorCode(resp.status), `豆包 ${resp.status}: ${text.slice(0, 200)}`, resp.status)
  }

  const data = await resp.json()
  const message = data.choices?.[0]?.message || {}

  if (tools?.length) {
    const assistantToolCalls = normalizeAssistantToolCalls(message.tool_calls || [])
    const toolCalls = normalizeToolCalls(assistantToolCalls)
    return {
      content: message.content || '',
      assistant_message: { role: 'assistant', content: message.content || null, ...(assistantToolCalls.length ? { tool_calls: assistantToolCalls } : {}) },
      tool_calls: toolCalls
    }
  }

  return message.content || ''
}

module.exports = { DoubaoError, chat, normalizeAssistantToolCalls, normalizeToolCalls }

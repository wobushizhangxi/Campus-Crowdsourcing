const { register } = require('./index')
const { healthCheck, execute } = require('../services/desktop/adapter')
const { requestConfirm } = require('../confirm')

async function desktopType(args, context = {}) {
  const { text } = args

  if (!text || typeof text !== 'string') {
    return { error: { code: 'INVALID_ARGS', message: '需要提供 text 参数（要输入的文本）。' } }
  }

  // Medium-risk operation — confirm with user
  if (!context.skipInternalConfirm) {
    const allowed = await requestConfirm({
      kind: 'desktop-type',
      payload: { text },
    })
    if (!allowed) {
      return { error: { code: 'USER_CANCELLED', message: '用户已取消桌面输入操作。' } }
    }
  }

  const health = await healthCheck()
  if (!health.available) {
    return {
      error: {
        code: 'RUNTIME_UNAVAILABLE',
        message: 'UI-TARS 桌面运行时不可用。请确认 uitars-bridge (port 8765) 已启动。',
        detail: health.detail,
      },
    }
  }

  const result = await execute(
    { type: 'keyboard.type', payload: { text } },
    { signal: context.signal, sessionId: context.sessionId }
  )

  if (!result.ok) {
    return { error: result.error || { code: 'TYPE_FAILED', message: '桌面输入失败。' } }
  }

  return {
    text,
    exit_code: result.exitCode,
    duration_ms: result.durationMs,
    metadata: result.metadata,
  }
}

register({
  name: 'desktop_type',
  description: 'Type text at the current keyboard focus on the desktop. Use this after clicking into a text field to input content. Args: text (required) — the exact text to type.',
  parameters: {
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The exact text to type at the current focus.' },
    },
    required: ['text'],
  },
}, desktopType)

module.exports = { desktopType }

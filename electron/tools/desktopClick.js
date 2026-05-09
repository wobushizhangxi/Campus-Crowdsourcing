const { register } = require('./index')
const { healthCheck, execute } = require('../services/desktop/adapter')
const { requestConfirm } = require('../confirm')

async function desktopClick(args, context = {}) {
  const { target } = args

  if (!target || typeof target !== 'string') {
    return { error: { code: 'INVALID_ARGS', message: '需要提供 target 参数（点击目标的自然语言描述）。' } }
  }

  // High-risk operation — confirm with user
  if (!context.skipInternalConfirm) {
    const allowed = await requestConfirm({
      kind: 'desktop-click',
      payload: { target },
    })
    if (!allowed) {
      return { error: { code: 'USER_CANCELLED', message: '用户已取消桌面点击操作。' } }
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
    { type: 'mouse.click', payload: { target } },
    { signal: context.signal, sessionId: context.sessionId }
  )

  if (!result.ok) {
    return { error: result.error || { code: 'CLICK_FAILED', message: '桌面点击失败。' } }
  }

  return {
    target,
    exit_code: result.exitCode,
    duration_ms: result.durationMs,
    metadata: result.metadata,
  }
}

register({
  name: 'desktop_click',
  description: 'Click on a UI element on the desktop screen identified by a natural-language description. The AI vision model will locate the element and click it. Args: target (required) — natural-language description of what to click (e.g., "the blue Submit button in the bottom right", "the Chrome icon on the taskbar").',
  parameters: {
    type: 'object',
    properties: {
      target: { type: 'string', description: 'Natural-language description of the element to click.' },
    },
    required: ['target'],
  },
}, desktopClick)

module.exports = { desktopClick }

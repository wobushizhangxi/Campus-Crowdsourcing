const { register } = require('./index')
const { healthCheck, execute } = require('../services/desktop/adapter')

async function desktopObserve(args, context = {}) {
  const health = await healthCheck()
  if (!health.available) {
    return {
      error: {
        code: 'RUNTIME_UNAVAILABLE',
        message: 'UI-TARS 桌面运行时不可用。请确认 uitars-bridge (port 8765) 已启动并且 Doubao vision 模型已配置。',
        detail: health.detail,
      },
    }
  }

  const result = await execute(
    { type: 'screen.observe', payload: {} },
    { signal: context.signal, sessionId: context.sessionId }
  )

  if (!result.ok) {
    return { error: result.error || { code: 'OBSERVE_FAILED', message: '屏幕截图失败。' } }
  }

  return {
    screenshot_base64: result.metadata?.screenshotBase64 || '',
    mime: result.metadata?.mime || 'image/png',
    duration_ms: result.durationMs,
  }
}

register({
  name: 'desktop_observe',
  description: 'Capture a screenshot of the current desktop screen. Returns a base64-encoded PNG image. Use this to see what is currently on screen before clicking or typing.',
  parameters: {
    type: 'object',
    properties: {},
    required: [],
  },
}, desktopObserve)

module.exports = { desktopObserve }

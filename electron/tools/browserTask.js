const { register } = require('./index')
const { healthCheck, execute } = require('../services/browserUse/adapter')
const { requestConfirm } = require('../confirm')

async function browserTask(args, context = {}) {
  const { goal, max_steps = 15, start_url } = args

  if (!goal || typeof goal !== 'string') {
    return { error: { code: 'INVALID_ARGS', message: '需要提供 goal 参数（浏览器任务描述）。' } }
  }

  // Check sidecar health
  const health = await healthCheck()
  if (!health.available) {
    return {
      error: {
        code: 'RUNTIME_UNAVAILABLE',
        message: 'browser-use 运行时不可用。请确认 Python 3.11+ 和 browser-use 已安装，并在设置中配置 Doubao vision 模型。',
        detail: health.detail,
      },
    }
  }

  // Confirm with user (medium risk)
  if (!context.skipInternalConfirm) {
    const allowed = await requestConfirm({
      kind: 'browser-task',
      payload: { goal, max_steps, start_url },
    })
    if (!allowed) {
      return { error: { code: 'USER_CANCELLED', message: '用户已取消浏览器任务。' } }
    }
  }

  const result = await execute(
    { goal, max_steps, start_url },
    { signal: context.signal }
  )

  return result
}

register({
  name: 'browser_task',
  description: 'Run a self-contained web browser sub-task using AI. The agent will navigate, click, type, and extract information from real web pages. Use this for: logging into websites, scraping information, filling forms, navigating to URLs. Args: goal (required) — natural-language task description; max_steps (optional, default 15) — maximum browser steps; start_url (optional) — starting URL.',
  parameters: {
    type: 'object',
    properties: {
      goal: { type: 'string', description: 'Natural-language description of the browser task.' },
      max_steps: { type: 'number', description: 'Maximum browser interaction steps. Default 15.' },
      start_url: { type: 'string', description: 'Optional starting URL.' },
    },
    required: ['goal'],
  },
}, browserTask)

module.exports = { browserTask }

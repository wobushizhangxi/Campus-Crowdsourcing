const { store } = require('../store')
const deepseek = require('../services/deepseek')
const tools = require('../tools')
const skillRegistry = require('../skills/registry')
const userRules = require('../services/userRules')
const { runTurn } = require('../services/agentLoop')
const { requestConfirm } = require('../confirm')

const BASE_PROMPT = '你是 AionUi，一个桌面控制平面助手。请默认使用简体中文，回答要简洁、专业。所有用户输入都在同一个 Agent Loop 中处理：普通问题直接回答，需要本地、浏览器或桌面操作时再调用工具。除非 AionUi 已报告审批通过的执行结果，否则不要暗示本地动作已经运行。'
const FULL_PROMPT = `${BASE_PROMPT}\n\n当前配置允许兼容工具进入候选集，但所有执行仍必须经过 AionUi 策略、确认、适配器和审计日志。`
const REMEMBER_GUIDANCE = '当用户表达长期偏好，例如”以后””始终””下次”或”从现在开始”时，调用 remember_user_rule。不要记住一次性任务细节。'
const TOOL_CALL_RULES = `
## 工具调用规则（必须遵守）

当用户请求涉及以下操作时，你**必须调用对应的工具函数**，
**绝对不要用文字描述来代替工具调用**：

| 用户意图 | 必须调用的工具 |
|---------|-------------|
| 打开网页/浏览网站/点击页面 | \`browser_task\` |
| 截屏/观察屏幕 | \`desktop_observe\` |
| 点击桌面/鼠标操作 | \`desktop_click\` |
| 输入文字/键盘操作 | \`desktop_type\` |
| 执行命令/运行脚本 | \`run_shell_command\` |
| 读写文件 | \`file_read\` / \`file_write\` |
| 生成文档/PPT | \`generate_document\` |

如果用户说”帮我打开X”或”点击X”，你不能回复”好的我来做”然后什么都不做。
你必须调用对应工具。工具执行结果会返回给你，你再据此回复用户。`
const pendingApprovals = new Map()
const activeControllers = new Map()

function approvalKey(convId, callId) {
  return `${convId}:${callId}`
}

function resolvePendingApproval(convId, callId, approved) {
  const key = approvalKey(convId, callId)
  const pending = pendingApprovals.get(key)
  if (!pending) return false
  pendingApprovals.delete(key)
  pending(Boolean(approved))
  return true
}

function clearPendingApprovals(convId) {
  const prefix = `${convId}:`
  for (const [key, resolve] of pendingApprovals) {
    if (key.startsWith(prefix)) {
      resolve(false)
      pendingApprovals.delete(key)
    }
  }
}

function buildSystemPrompt(config, deps) {
  const parts = []
  const isFull = config.permissionMode === 'full'
  parts.push(isFull ? FULL_PROMPT : BASE_PROMPT)
  parts.push(TOOL_CALL_RULES)
  const rules = deps.userRules.buildSystemPromptSection()
  if (rules) parts.push(rules)
  if (isFull) {
    const skillIndex = deps.skillRegistry.buildSkillIndex(deps.skillRegistry.listSkills())
    if (skillIndex) parts.push(skillIndex)
    parts.push(REMEMBER_GUIDANCE)
  }
  return parts.join('\n\n')
}

async function handleChatSend(evt, payload = {}, deps) {
  const { convId, messages = [], model } = payload
  const send = (event, data = {}) => evt.sender.send(event, { convId, ...data })
  const config = deps.storeRef.getConfig()
  const ctl = new AbortController()
  activeControllers.set(convId, ctl)
  const agentMessages = [
    { role: 'system', content: buildSystemPrompt(config, deps) },
    ...messages.filter(m => m.role === 'user' || m.role === 'assistant' || m.role === 'tool')
  ]
  let sentText = ''

  const sendDelta = (text) => {
    if (!text) return
    sentText += text
    send('chat:delta', { text })
  }

  try {
    const result = await deps.runTurn({
      messages: agentMessages,
      model,
      signal: ctl.signal,
      onEvent: (type, data) => {
        if (type === 'assistant_message') {
          sendDelta(data.content)
          if (data.toolCalls?.length) {
            for (const call of data.toolCalls) {
              send('chat:tool-start', { callId: call.id, name: call.name, args: call.args })
            }
          }
        } else if (type === 'tool_result') {
          send('chat:tool-result', { callId: data.call.id, result: data.result })
          if (data.call.name === 'load_skill' && !data.result?.error) {
            send('chat:skill-loaded', { name: data.call.args.name })
          }
        } else if (type === 'tool_blocked') {
          send('chat:tool-error', { callId: data.call.id, error: { code: 'POLICY_BLOCKED', message: data.reason } })
        } else if (type === 'approval_request') {
          send('chat:tool-start', { callId: data.call.id, name: data.call.name, args: data.call.args, needsApproval: true, decision: data.decision })
        }
      },
      requestApproval: async ({ call, decision }) => {
        const approved = await new Promise((resolve) => {
          pendingApprovals.set(approvalKey(convId, call.id), resolve)
        })
        if (approved) {
          send('chat:tool-start', { callId: call.id, name: call.name, args: call.args, needsApproval: false })
        } else {
          send('chat:tool-error', { callId: call.id, error: { code: 'USER_DENIED', message: '用户已拒绝执行。' } })
        }
        return approved
      }
    })

    const finalText = result.finalText || ''
    if (finalText && !sentText.trimEnd().endsWith(finalText.trim())) sendDelta(finalText)
    send('chat:done', {})
    return { ok: true }
  } catch (error) {
    const code = error instanceof deps.DeepSeekError ? error.code : 'INTERNAL'
    send('chat:error', { error: { code, message: error.message || '未知错误' } })
    return { ok: true }
  } finally {
    activeControllers.delete(convId)
    clearPendingApprovals(convId)
  }
}

function createRegister(overrides = {}) {
  const deps = {
    storeRef: store,
    deepseek,
    DeepSeekError: deepseek.DeepSeekError,
    execute: tools.execute,
    toolSchemas: tools.TOOL_SCHEMAS,
    skillRegistry,
    userRules,
    runTurn,
    requestConfirm,
    ...overrides
  }
  return function register(ipcMain) {
    ipcMain.handle('chat:send', (evt, payload) => handleChatSend(evt, payload, deps))
    ipcMain.handle('chat:approve-tool', async (_evt, payload = {}) => {
      resolvePendingApproval(payload.convId, payload.callId, payload.approved)
      return { ok: true }
    })
    ipcMain.handle('chat:abort', async (_evt, payload = {}) => {
      const ctl = activeControllers.get(payload.convId)
      if (ctl) ctl.abort()
      clearPendingApprovals(payload.convId)
      return { ok: true }
    })
  }
}

const register = createRegister()

module.exports = { BASE_PROMPT, FULL_PROMPT, REMEMBER_GUIDANCE, TOOL_CALL_RULES, buildSystemPrompt, handleChatSend, createRegister, register }

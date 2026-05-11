import { test, expect, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createRegister, buildSystemPrompt } = require('../ipc/chat')

function createIpcMain() {
  const handlers = new Map()
  return { handlers, handle: vi.fn((channel, handler) => handlers.set(channel, handler)) }
}

test('chat:send routes plain messages through the unified agent loop', async () => {
  const ipcMain = createIpcMain()
  const send = vi.fn()
  const runTurn = vi.fn(async ({ onEvent }) => {
    onEvent('assistant_message', { content: 'hello world', toolCalls: [] })
    return { finalText: 'hello world', history: [] }
  })
  const register = createRegister({
    storeRef: { getConfig: () => ({ permissionMode: 'default' }) },
    deepseek: { chat: vi.fn() },
    runTurn,
    userRules: { buildSystemPromptSection: () => '' },
    skillRegistry: { listSkills: () => [], buildSkillIndex: () => '' }
  })
  register(ipcMain)

  const result = await ipcMain.handlers.get('chat:send')({ sender: { send } }, { convId: 'conv-1', messages: [{ role: 'user', content: 'hi' }] })
  expect(result).toEqual({ ok: true })
  expect(runTurn).toHaveBeenCalledWith(expect.objectContaining({
    messages: expect.arrayContaining([expect.objectContaining({ role: 'user', content: 'hi' })])
  }))
  expect(send).toHaveBeenCalledWith('chat:delta', { convId: 'conv-1', text: 'hello world' })
  expect(send.mock.calls.filter(([event]) => event === 'chat:delta')).toHaveLength(1)
  expect(send).toHaveBeenCalledWith('chat:done', { convId: 'conv-1' })
})

test('chat:send forwards unified agent loop tool events', async () => {
  const ipcMain = createIpcMain()
  const send = vi.fn()
  const runTurn = vi.fn(async ({ onEvent }) => {
    onEvent('assistant_message', { content: 'thinking...', toolCalls: [{ id: 'call-1', name: 'read_file', args: { path: 'x' } }] })
    onEvent('tool_result', { call: { id: 'call-1', name: 'read_file', args: { path: 'x' } }, result: { content: 'file text' } })
    onEvent('tool_blocked', { call: { id: 'call-2', name: 'write_file', args: { path: 'C:\\Windows\\evil.txt' } }, reason: '系统路径已被阻止。' })
    onEvent('tool_error', { call: { id: 'call-3', name: 'browser_task', args: { goal: 'open' } }, error: { code: 'BROWSER_TASK_INCOMPLETE', message: 'summary_missing' } })
    onEvent('assistant_message', { content: 'done', toolCalls: [] })
    return { finalText: 'done', history: [] }
  })
  const register = createRegister({
    storeRef: { getConfig: () => ({ permissionMode: 'full' }) },
    runTurn,
    userRules: { buildSystemPromptSection: () => '' },
    skillRegistry: { listSkills: () => [{ name: 'file-explorer', description: 'files' }], buildSkillIndex: () => 'skill index' }
  })
  register(ipcMain)

  await ipcMain.handlers.get('chat:send')({ sender: { send } }, { convId: 'conv-1', messages: [{ role: 'user', content: 'read' }] })
  expect(runTurn).toHaveBeenCalled()
  expect(send).toHaveBeenCalledWith('chat:delta', { convId: 'conv-1', text: 'thinking...' })
  expect(send).toHaveBeenCalledWith('chat:tool-start', { convId: 'conv-1', callId: 'call-1', name: 'read_file', args: { path: 'x' } })
  expect(send).toHaveBeenCalledWith('chat:tool-result', { convId: 'conv-1', callId: 'call-1', result: { content: 'file text' } })
  expect(send).toHaveBeenCalledWith('chat:tool-error', { convId: 'conv-1', callId: 'call-2', error: { code: 'POLICY_BLOCKED', message: '系统路径已被阻止。' } })
  expect(send).toHaveBeenCalledWith('chat:tool-error', { convId: 'conv-1', callId: 'call-3', error: { code: 'BROWSER_TASK_INCOMPLETE', message: 'summary_missing' } })
  expect(send).toHaveBeenCalledWith('chat:delta', { convId: 'conv-1', text: 'done' })
  expect(send).toHaveBeenCalledWith('chat:done', { convId: 'conv-1' })
})

test('chat:send waits for inline tool approval over chat IPC', async () => {
  const ipcMain = createIpcMain()
  const send = vi.fn()
  const call = { id: 'call-approval', name: 'run_shell_command', args: { command: 'npm install' } }
  const decision = { risk: 'high', reason: '安装命令需要明确确认。' }
  const retry = { attempt: 2, previousError: { code: 'BROWSER_TASK_INCOMPLETE', message: 'summary_missing' } }
  let approvedValue
  const runTurn = vi.fn(async ({ onEvent, requestApproval }) => {
    onEvent('assistant_message', { content: '', toolCalls: [call] })
    onEvent('approval_request', { call, decision, retry })
    approvedValue = await requestApproval({ call, decision })
    return { finalText: approvedValue ? 'approved' : 'denied', history: [] }
  })
  const register = createRegister({
    storeRef: { getConfig: () => ({ permissionMode: 'default' }) },
    runTurn,
    userRules: { buildSystemPromptSection: () => '' },
    skillRegistry: { listSkills: () => [], buildSkillIndex: () => '' }
  })
  register(ipcMain)

  const pending = ipcMain.handlers.get('chat:send')({ sender: { send } }, { convId: 'conv-1', messages: [{ role: 'user', content: 'install deps' }] })
  await Promise.resolve()

  expect(send).toHaveBeenCalledWith('chat:tool-start', { convId: 'conv-1', callId: call.id, name: call.name, args: call.args, needsApproval: true, decision, retry })
  expect(approvedValue).toBeUndefined()

  const approval = await ipcMain.handlers.get('chat:approve-tool')({}, { convId: 'conv-1', callId: call.id, approved: true })
  expect(approval).toEqual({ ok: true })
  await pending

  expect(approvedValue).toBe(true)
  expect(send).toHaveBeenCalledWith('chat:tool-start', { convId: 'conv-1', callId: call.id, name: call.name, args: call.args, needsApproval: false })
  expect(send).toHaveBeenCalledWith('chat:delta', { convId: 'conv-1', text: 'approved' })
  expect(send).toHaveBeenCalledWith('chat:done', { convId: 'conv-1' })
})

test('buildSystemPrompt includes rules and skill index only in full mode', () => {
  const deps = { userRules: { buildSystemPromptSection: () => 'rules' }, skillRegistry: { listSkills: () => [{ name: 'x', description: 'y' }], buildSkillIndex: () => 'skills' } }
  expect(buildSystemPrompt({ permissionMode: 'default' }, deps)).toContain('rules')
  expect(buildSystemPrompt({ permissionMode: 'default' }, deps)).not.toContain('skills')
  expect(buildSystemPrompt({ permissionMode: 'full' }, deps)).toContain('skills')
})

test('chat:send ignores legacy mode flags and still uses the unified agent loop', async () => {
  const ipcMain = createIpcMain()
  const send = vi.fn()
  const runTurn = vi.fn(async ({ onEvent }) => {
    onEvent('assistant_message', { content: 'legacy-compatible', toolCalls: [] })
    return { finalText: 'done', history: [] }
  })
  const register = createRegister({
    storeRef: { getConfig: () => ({ permissionMode: 'default' }) },
    runTurn,
    userRules: { buildSystemPromptSection: () => '' },
    skillRegistry: { listSkills: () => [], buildSkillIndex: () => '' }
  })
  register(ipcMain)

  await ipcMain.handlers.get('chat:send')({ sender: { send } }, { convId: 'conv-1', mode: 'execute', messages: [{ role: 'user', content: 'run tests' }] })
  expect(runTurn).toHaveBeenCalled()
  expect(send).toHaveBeenCalledWith('chat:delta', { convId: 'conv-1', text: 'legacy-compatible' })
  expect(send).toHaveBeenCalledWith('chat:delta', { convId: 'conv-1', text: 'done' })
  expect(send).toHaveBeenCalledWith('chat:done', { convId: 'conv-1' })
})

test('browser plugin mode marks user message for browser task routing', async () => {
  const ipcMain = createIpcMain()
  const send = vi.fn()
  const runTurn = vi.fn(async ({ onEvent }) => {
    onEvent('assistant_message', { content: 'browser ready', toolCalls: [] })
    return { finalText: 'browser ready', history: [] }
  })
  const register = createRegister({
    storeRef: { getConfig: () => ({ permissionMode: 'default' }) },
    runTurn,
    userRules: { buildSystemPromptSection: () => '' },
    skillRegistry: { listSkills: () => [], buildSkillIndex: () => '' }
  })
  register(ipcMain)

  await ipcMain.handlers.get('chat:send')({ sender: { send } }, {
    convId: 'conv-browser-plugin',
    messages: [{ role: 'user', content: '打开 https://example.com 看标题' }],
    model: 'browser-use',
    pluginMode: 'browser',
  })

  expect(runTurn).toHaveBeenCalledWith(expect.objectContaining({
    model: 'browser-use',
    forceTool: 'browser_task',
  }))
})

test('chat:send forwards stream events from the agent loop', async () => {
  const ipcMain = createIpcMain()
  const send = vi.fn()
  const streamEvent = { id: 'stream-1', type: 'reasoning_summary', text: '我正在判断是否需要调用工具。', ts: 1 }
  const runTurn = vi.fn(async ({ onEvent, onStreamEvent }) => {
    onStreamEvent(streamEvent)
    onEvent('assistant_message', { content: 'done', toolCalls: [] })
    return { finalText: 'done', history: [] }
  })
  const register = createRegister({
    storeRef: { getConfig: () => ({ permissionMode: 'default' }) },
    runTurn,
    userRules: { buildSystemPromptSection: () => '' },
    skillRegistry: { listSkills: () => [], buildSkillIndex: () => '' }
  })
  register(ipcMain)

  await ipcMain.handlers.get('chat:send')({ sender: { send } }, { convId: 'conv-stream', messages: [{ role: 'user', content: 'hi' }] })

  expect(send).toHaveBeenCalledWith('chat:stream', { convId: 'conv-stream', event: streamEvent })
})

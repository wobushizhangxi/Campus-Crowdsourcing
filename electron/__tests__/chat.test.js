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
  expect(send).toHaveBeenCalledWith('chat:delta', { convId: 'conv-1', text: 'done' })
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

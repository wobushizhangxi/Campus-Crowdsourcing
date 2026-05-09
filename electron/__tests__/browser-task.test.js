import { test, expect, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)

// Mock adapter before loading tool module
vi.mock('../services/browserUse/adapter', () => ({
  healthCheck: vi.fn(async () => ({ available: true, detail: { ok: true } })),
  execute: vi.fn(async () => ({ ok: true, summary: 'done', final_url: 'https://example.com' })),
  cancel: vi.fn(),
}))

// Mock confirm
vi.mock('../confirm', () => ({
  requestConfirm: vi.fn(async () => true),
}))

const { register, TOOLS, TOOL_SCHEMAS, execute } = require('../tools')
const toolPolicy = require('../security/toolPolicy')

test('browser_task is registered in tool registry', () => {
  const schemas = TOOL_SCHEMAS
  const browserTaskSchema = schemas.find(s => s.name === 'browser_task')
  expect(browserTaskSchema).toBeDefined()
  expect(browserTaskSchema.parameters.required).toContain('goal')
})

test('browser_task tool policy returns medium risk', () => {
  const decision = toolPolicy.evaluateToolCall('browser_task', { goal: 'test' })
  expect(decision.risk).toBe('medium')
  expect(decision.allowed).toBe(true)
  expect(decision.requiresApproval).toBe(true)
})

test('browser_task rejects empty goal', async () => {
  const { browserTask } = require('../tools/browserTask')
  const result = await browserTask({}, { skipInternalConfirm: true })
  expect(result.error).toBeDefined()
  expect(result.error.code).toBe('INVALID_ARGS')
})

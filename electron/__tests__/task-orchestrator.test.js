import { test, expect, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createTaskOrchestrator, summarizeSubmitted } = require('../services/taskOrchestrator')

test('uses dry-run planning when Qwen is not configured', async () => {
  const broker = { submitActions: vi.fn(async (actions) => actions.map((action) => ({ ...action, status: 'pending' }))) }
  const events = []
  const orchestrator = createTaskOrchestrator({
    storeRef: { getConfig: () => ({ dryRunEnabled: true, workspace_root: 'C:\\work' }) },
    broker,
    addRunOutput: vi.fn(),
    now: () => new Date('2026-05-08T00:00:00Z')
  })

  const result = await orchestrator.runExecutionTask({
    convId: 'sess1',
    messages: [{ role: 'user', content: 'inspect a fake screen and run a command' }],
    onEvent: (event, data) => events.push({ event, data })
  })

  expect(result.dryRun).toBe(true)
  expect(broker.submitActions).toHaveBeenCalled()
  expect(events.map((item) => item.event)).toEqual(['chat:action-plan', 'chat:action-update'])
  expect(result.content).toContain('[演示模式]')
})

test('uses DeepSeek model router when configured', async () => {
  const modelRouter = {
    jsonForRole: vi.fn(async () => ({
      actions: [{ runtime: 'open-interpreter', type: 'shell.command', payload: { command: 'git status' }, risk: 'low' }]
    }))
  }
  const broker = { submitActions: vi.fn(async (actions) => actions.map((action) => ({ ...action, status: 'completed', result: { stdout: 'clean' } }))) }
  const addRunOutput = vi.fn((output) => ({ id: 'out1', ...output }))
  const orchestrator = createTaskOrchestrator({
    storeRef: { getConfig: () => ({ deepseekApiKey: 'sk-deepseek', dryRunEnabled: true }) },
    modelRouter,
    broker,
    addRunOutput,
    now: () => new Date('2026-05-08T00:00:00Z')
  })
  const result = await orchestrator.runExecutionTask({ convId: 'sess2', messages: [{ role: 'user', content: 'run git status' }] })
  expect(modelRouter.jsonForRole).toHaveBeenCalled()
  expect(result.actions[0].status).toBe('completed')
  expect(addRunOutput).toHaveBeenCalled()
})

test('vision path observes and calls visionPlanner when enabled for web-shaped tasks', async () => {
  const visionPlanner = {
    planNext: vi.fn(async () => ({
      actions: [{ runtime: 'midscene', type: 'web.click', payload: { target: 'chapter' }, risk: 'medium' }]
    }))
  }
  const fetchImpl = vi.fn(async () => ({
    ok: true,
    json: async () => ({ ok: true, metadata: { screenshotBase64: 'XYZ' } })
  }))
  const modelRouter = { jsonForRole: vi.fn() }
  const broker = { submitActions: vi.fn(async (actions) => actions.map((action) => ({ ...action, status: 'pending' }))) }
  const orchestrator = createTaskOrchestrator({
    storeRef: { getConfig: () => ({
      visionLoopEnabled: true,
      dryRunEnabled: false,
      deepseekApiKey: 'sk',
      doubaoVisionApiKey: 'k',
      doubaoVisionEndpoint: 'https://x',
      doubaoVisionModel: 'm'
    }) },
    visionPlanner,
    fetchImpl,
    modelRouter,
    broker,
    addRunOutput: vi.fn(),
    now: () => new Date('2026-05-09T00:00:00Z')
  })

  await orchestrator.runExecutionTask({
    convId: 'sess',
    messages: [{ role: 'user', content: 'click the chapter button on the web page' }]
  })

  expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining('/execute'), expect.anything())
  expect(visionPlanner.planNext).toHaveBeenCalledWith(expect.objectContaining({
    goal: 'click the chapter button on the web page',
    screenshotBase64: 'XYZ'
  }))
  expect(modelRouter.jsonForRole).not.toHaveBeenCalled()
  expect(broker.submitActions).toHaveBeenCalled()
})

test('vision path falls back to text planner when internal observe throws', async () => {
  const visionPlanner = { planNext: vi.fn() }
  const fetchImpl = vi.fn(async () => { throw new Error('ECONNREFUSED') })
  const modelRouter = {
    jsonForRole: vi.fn(async () => ({
      actions: [{ runtime: 'open-interpreter', type: 'shell.command', payload: { command: 'dir' }, risk: 'low' }]
    }))
  }
  const broker = { submitActions: vi.fn(async (actions) => actions.map((action) => ({ ...action, status: 'completed' }))) }
  const events = []
  const orchestrator = createTaskOrchestrator({
    storeRef: { getConfig: () => ({
      visionLoopEnabled: true,
      dryRunEnabled: false,
      deepseekApiKey: 'sk',
      doubaoVisionApiKey: 'k',
      doubaoVisionEndpoint: 'https://x',
      doubaoVisionModel: 'm'
    }) },
    visionPlanner,
    fetchImpl,
    modelRouter,
    broker,
    addRunOutput: vi.fn(),
    now: () => new Date('2026-05-09T00:00:00Z')
  })

  await orchestrator.runExecutionTask({
    convId: 'sess',
    messages: [{ role: 'user', content: 'click the chapter button on the web page' }],
    onEvent: (event, payload) => events.push({ event, payload })
  })

  expect(modelRouter.jsonForRole).toHaveBeenCalled()
  expect(visionPlanner.planNext).not.toHaveBeenCalled()
  expect(events.find((item) => item.event === 'chat:vision-fallback')).toBeTruthy()
})

test('text path skips vision when visionLoopEnabled is false', async () => {
  const visionPlanner = { planNext: vi.fn() }
  const modelRouter = { jsonForRole: vi.fn(async () => ({ actions: [] })) }
  const broker = { submitActions: vi.fn(async () => []) }
  const orchestrator = createTaskOrchestrator({
    storeRef: { getConfig: () => ({ visionLoopEnabled: false, dryRunEnabled: false, deepseekApiKey: 'sk' }) },
    visionPlanner,
    modelRouter,
    broker,
    addRunOutput: vi.fn(),
    now: () => new Date('2026-05-09T00:00:00Z')
  })

  await orchestrator.runExecutionTask({
    convId: 's',
    messages: [{ role: 'user', content: 'click the chapter button on the web page' }]
  })

  expect(visionPlanner.planNext).not.toHaveBeenCalled()
  expect(modelRouter.jsonForRole).toHaveBeenCalled()
})

test('text path skips vision for non-web tasks even when visionLoopEnabled is true', async () => {
  const visionPlanner = { planNext: vi.fn() }
  const modelRouter = { jsonForRole: vi.fn(async () => ({ actions: [] })) }
  const broker = { submitActions: vi.fn(async () => []) }
  const orchestrator = createTaskOrchestrator({
    storeRef: { getConfig: () => ({
      visionLoopEnabled: true,
      dryRunEnabled: false,
      deepseekApiKey: 'sk',
      doubaoVisionApiKey: 'k',
      doubaoVisionEndpoint: 'https://x',
      doubaoVisionModel: 'm'
    }) },
    visionPlanner,
    modelRouter,
    broker,
    addRunOutput: vi.fn(),
    now: () => new Date('2026-05-09T00:00:00Z')
  })

  await orchestrator.runExecutionTask({
    convId: 's',
    messages: [{ role: 'user', content: 'run git status' }]
  })

  expect(visionPlanner.planNext).not.toHaveBeenCalled()
  expect(modelRouter.jsonForRole).toHaveBeenCalled()
})

test('summarizes action statuses for chat', () => {
  expect(summarizeSubmitted([{ status: 'pending' }, { status: 'completed' }])).toContain('待审批 1 个')
})

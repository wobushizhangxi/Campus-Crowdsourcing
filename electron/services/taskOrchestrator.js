const { store } = require('../store')
const modelRouter = require('./modelRouter')
const { MODEL_ROLES } = require('./models/modelTypes')
const { buildPlannerPrompt, normalizeActionPlan } = require('./actionPlanner')
const visionPlannerModule = require('./visionPlanner')
const dryRunRuntime = require('./dryRunRuntime')
const { getBroker } = require('../ipc/actions')
const { addRunOutput } = require('./runOutputs')

const WEB_KEYWORDS = [
  'web',
  'website',
  'browser',
  'page',
  'url',
  'http',
  'click',
  'login',
  'gmail',
  'github',
  'taobao',
  'chaoxing',
  'chapter',
  'course',
  '网页',
  '网站',
  '浏览器',
  '登录',
  '点击',
  '打开',
  '学习通',
  '章节',
  '课程'
]

const NON_WEB_KEYWORDS = [
  'shell',
  'command',
  'git',
  'npm',
  'python',
  'file',
  'code',
  'run ',
  '命令',
  '执行 ',
  '运行 ',
  '文件',
  '代码'
]

function lastUserMessage(messages = []) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content || ''
}

function summarizeSubmitted(actions = []) {
  if (!actions.length) return '本次没有生成可执行动作。'
  const counts = actions.reduce((acc, action) => {
    acc[action.status] = (acc[action.status] || 0) + 1
    return acc
  }, {})
  const statusLabels = {
    proposed: '已提议',
    pending: '待审批',
    approved: '已批准',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    denied: '已拒绝',
    blocked: '已阻止',
    cancelled: '已取消'
  }
  const parts = Object.entries(counts).map(([status, count]) => `${statusLabels[status] || status} ${count} 个`)
  return `AionUi 已准备 ${actions.length} 个动作：${parts.join('，')}。请在控制中心查看待审批动作。`
}

function saveCompletedOutputs(actions = [], addOutput = addRunOutput) {
  const outputs = []
  for (const action of actions) {
    if (action.result || action.status === 'completed' || action.status === 'failed') {
      outputs.push(addOutput({
        sessionId: action.sessionId,
        actionId: action.id,
        type: action.type,
        title: action.title,
        summary: action.result?.stdout || action.error?.message || action.summary,
        metadata: { status: action.status, runtime: action.runtime, result: action.result || null }
      }))
    }
  }
  return outputs
}

function looksLikeWebTask(latestUserMessage = '', messages = []) {
  const text = String(latestUserMessage || '')
  const lower = text.toLowerCase()
  if (NON_WEB_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()))) return false
  if (WEB_KEYWORDS.some((keyword) => lower.includes(keyword.toLowerCase()) || text.includes(keyword))) return true

  if (/^(continue|next|again|ok|done|继续|下一步|再来一次|好了|登录好了)$/.test(text.trim())) {
    const lastAssistant = [...messages].reverse().find((message) => message.role === 'assistant')
    return Boolean(lastAssistant && /midscene|web\./.test(String(lastAssistant.content || '')))
  }

  return false
}

async function internalObserve(config = {}, fetchImpl = global.fetch) {
  if (!fetchImpl) throw new Error('No fetch implementation available for internal observe')
  const endpoint = (config.midsceneEndpoint || 'http://127.0.0.1:8770').replace(/\/+$/, '')
  const response = await fetchImpl(`${endpoint}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      protocol: 'aionui.midscene.v1',
      actionId: `internal-observe-${Date.now()}`,
      sessionId: 'orchestrator',
      type: 'web.observe',
      payload: {},
      approved: true,
      createdAt: new Date().toISOString()
    })
  })
  if (!response.ok) throw new Error(`internalObserve HTTP ${response.status}`)
  const data = await response.json()
  if (!data?.metadata?.screenshotBase64) throw new Error('internalObserve returned no screenshot')
  return data.metadata.screenshotBase64
}

function createTaskOrchestrator(overrides = {}) {
  const deps = {
    storeRef: store,
    modelRouter,
    visionPlanner: visionPlannerModule,
    fetchImpl: global.fetch,
    dryRunRuntime,
    broker: getBroker(),
    addRunOutput,
    now: () => new Date(),
    ...overrides
  }

  async function planWithModel(historyOrTask, config, sessionId) {
    const promptMessages = buildPlannerPrompt(historyOrTask)
    const raw = await deps.modelRouter.jsonForRole(MODEL_ROLES.TASK_PLANNING, promptMessages, { temperature: 0.1 }, config)
    return normalizeActionPlan(raw, { sessionId, now: deps.now() })
  }

  async function runExecutionTask({ convId, messages = [], dryRun = false, onEvent }) {
    const config = deps.storeRef.getConfig()
    const task = lastUserMessage(messages)
    const sessionId = convId || `sess_${Date.now()}`
    let proposals
    let usedDryRun = false

    if (dryRun || (config.dryRunEnabled !== false && !config.deepseekApiKey && !config.apiKey)) {
      const plan = deps.dryRunRuntime.planTask(task, { sessionId, cwd: config.workspace_root })
      proposals = plan.actions
      usedDryRun = true
    } else if (
      Boolean(config.visionLoopEnabled) &&
      Boolean(config.doubaoVisionEndpoint) &&
      Boolean(config.doubaoVisionApiKey) &&
      Boolean(config.doubaoVisionModel) &&
      looksLikeWebTask(task, messages)
    ) {
      let screenshotBase64 = null
      try {
        screenshotBase64 = await internalObserve(config, deps.fetchImpl)
      } catch (error) {
        onEvent?.('chat:vision-fallback', { stage: 'observe', reason: error.message })
      }

      if (screenshotBase64) {
        try {
          const raw = await deps.visionPlanner.planNext({
            goal: task,
            history: messages,
            screenshotBase64,
            config
          })
          proposals = normalizeActionPlan(raw, { sessionId, now: deps.now() })
        } catch (error) {
          onEvent?.('chat:vision-fallback', { stage: 'plan', reason: error.message })
          proposals = await planWithModel(messages, config, sessionId)
        }
      } else {
        proposals = await planWithModel(messages, config, sessionId)
      }
    } else {
      // Pass full conversation history to the planner so multi-turn cues
      // ("继续", "再来一次", "登录好了") resolve against prior turns.
      proposals = await planWithModel(messages, config, sessionId)
    }

    onEvent?.('chat:action-plan', { actions: proposals, dryRun: usedDryRun })
    const submitted = await deps.broker.submitActions(proposals, { config })
    const outputs = saveCompletedOutputs(submitted, deps.addRunOutput)
    onEvent?.('chat:action-update', { actions: submitted, outputs })

    return {
      content: `${usedDryRun ? '[演示模式] ' : ''}${summarizeSubmitted(submitted)}`,
      actions: submitted,
      outputs,
      dryRun: usedDryRun
    }
  }

  return { runExecutionTask }
}

module.exports = {
  createTaskOrchestrator,
  internalObserve,
  lastUserMessage,
  looksLikeWebTask,
  saveCompletedOutputs,
  summarizeSubmitted
}

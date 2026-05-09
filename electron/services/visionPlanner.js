const { getActionSchemaForVisionPrompt } = require('./actionPlanner')

class VisionPlannerError extends Error {
  constructor(code, message, details) {
    super(`${code}: ${message}`)
    this.name = 'VisionPlannerError'
    this.code = code
    this.details = details
  }
}

const SYSTEM_PROMPT = [
  'You are the AionUi vision-grounded action planner. You see a screenshot of the user\'s current Chrome tab.',
  'Plan the NEXT 1-3 actions to make progress toward the user\'s goal. Output ONLY JSON: { "actions": [...] }.',
  '',
  'TARGET DESCRIPTION RULES (critical — Midscene\'s per-action vision sometimes confuses adjacent items):',
  '  - Always include EXACTLY the visible text on the element you want to click.',
  '  - When two items look similar (e.g. two-character Chinese sidebar entries like 任务/章节/讨论), DISAMBIGUATE explicitly:',
  '    bad: "侧边栏的章节菜单"',
  '    good: "侧边栏从上数第三项,文字是\\"章节\\",在\\"任务\\"下方,\\"讨论\\"上方"',
  '    good: "left sidebar item with exact text \\"章节\\" (3rd item, NOT 任务)"',
  '  - Mention bounding context: position (Nth from top/left), color, surrounding labels, icons.',
  '  - Never use generic phrases like "the menu" or "登录按钮"; use the visible text + relative position.',
  '',
  'Login fields: never autofill credentials. If on a login page, plan only an observe so the user fills in manually, then expect them to say "继续" once logged in.',
  'If the goal looks done from the screenshot, return { "actions": [] } so the orchestrator can stop.',
  '',
  'Site-specific UI flows you should recognize from the screenshot:',
  '  学习通 (chaoxing.com / mooc) course page sidebar (left rail) typically lists in order:',
  '    AI助教 / 任务 / 章节 / 讨论 / 作业 / 考试 / 资料 / 错题集 / 学习记录 / 课程图谱',
  '    "任务" = todo list (often empty), NOT where videos live',
  '    "章节" = lecture list — videos live here, click 章节 to open the chapter list',
  '    Lecture rows: green ✓ = completed; orange "!" = unfinished; click an unfinished row to start its video',
  '    To watch the next unfinished video: click the sidebar item EXACTLY "章节" (3rd from top, between 任务 and 讨论), then click the first row showing an orange "!" mark',
  '',
  getActionSchemaForVisionPrompt()
].join('\n')

function buildHistoryText(history = []) {
  const lines = []
  for (const message of history) {
    if (!message || typeof message.content !== 'string') continue
    if (message.role === 'user') lines.push(`USER: ${message.content}`)
    else if (message.role === 'assistant') lines.push(`ASSISTANT: ${message.content}`)
  }
  return lines.length ? `Conversation so far:\n${lines.join('\n')}\n\n` : ''
}

function requireConfig(config = {}) {
  if (!config.doubaoVisionEndpoint || !config.doubaoVisionApiKey || !config.doubaoVisionModel) {
    throw new VisionPlannerError('VISION_NOT_CONFIGURED', 'Doubao vision endpoint/key/model missing in config.')
  }
}

function parseVisionContent(content) {
  let parsed
  try {
    parsed = JSON.parse(content)
  } catch {
    throw new VisionPlannerError('VISION_JSON_INVALID', `Doubao vision returned non-JSON: ${String(content).slice(0, 200)}`)
  }
  if (!parsed || !Array.isArray(parsed.actions)) {
    throw new VisionPlannerError('VISION_JSON_INVALID', 'Doubao vision JSON missing actions array.')
  }
  return parsed
}

async function planNext({ goal, history = [], screenshotBase64, config = {}, fetchImpl } = {}) {
  requireConfig(config)
  const fetcher = fetchImpl || global.fetch
  if (!fetcher) throw new VisionPlannerError('VISION_NO_FETCH', 'No fetch implementation available.')

  const url = `${config.doubaoVisionEndpoint.replace(/\/+$/, '')}/chat/completions`
  const userText = `${buildHistoryText(history)}Current goal: ${goal}\nLook at the screenshot and plan the next 1-3 actions.`
  const body = {
    model: config.doubaoVisionModel,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: screenshotBase64.startsWith('data:') ? screenshotBase64 : `data:image/jpeg;base64,${screenshotBase64}` } }
        ]
      }
    ],
    temperature: 0.1,
    response_format: { type: 'json_object' }
  }

  const response = await fetcher(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.doubaoVisionApiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new VisionPlannerError('VISION_HTTP_ERROR', `Doubao vision API ${response.status}: ${text.slice(0, 200)}`)
  }

  const data = await response.json().catch(() => null)
  const content = data?.choices?.[0]?.message?.content
  if (!content) throw new VisionPlannerError('VISION_NO_CONTENT', 'Doubao vision returned no content.')
  return parseVisionContent(content)
}

module.exports = {
  planNext,
  VisionPlannerError,
  SYSTEM_PROMPT
}

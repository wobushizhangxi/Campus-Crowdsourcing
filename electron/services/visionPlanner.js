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
  'Use concrete visual locators that describe what you SEE on this screenshot, e.g. "left sidebar item with text Chapter, 4th from top" not "navigation menu". Mention colors, positions, and surrounding text so Midscene can find the element.',
  'Login fields: never autofill credentials. If the user is on a login page, plan only an observe so they can fill in manually, then expect the user to say "continue" once logged in.',
  'If the goal looks done from the screenshot, return { "actions": [] } so the orchestrator can stop.',
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

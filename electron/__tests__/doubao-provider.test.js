import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { store } = require('../store')
const { chat } = require('../services/doubao')

beforeEach(() => {
  vi.spyOn(store, 'getConfig').mockReturnValue({
    doubaoVisionApiKey: 'ark-test-key',
    doubaoVisionEndpoint: 'https://ark.example/api/v3',
    doubaoVisionModel: 'ep-test'
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

test('preserves OpenAI-compatible assistant tool call history for follow-up requests', async () => {
  const rawToolCall = {
    id: 'call_browser_1',
    type: 'function',
    function: {
      name: 'browser_task',
      arguments: '{"task":"Open https://example.com and tell me the title."}'
    }
  }

  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            role: 'assistant',
            content: null,
            tool_calls: [rawToolCall]
          }
        }
      ]
    })
  })))

  const result = await chat({
    messages: [{ role: 'user', content: 'Open https://example.com and tell me the title.' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'browser_task',
          description: 'Run a browser task',
          parameters: { type: 'object', properties: { task: { type: 'string' } }, required: ['task'] }
        }
      }
    ]
  })

  expect(result.tool_calls).toEqual([
    {
      id: 'call_browser_1',
      name: 'browser_task',
      args: { task: 'Open https://example.com and tell me the title.' }
    }
  ])
  expect(result.assistant_message.tool_calls).toEqual([rawToolCall])
})

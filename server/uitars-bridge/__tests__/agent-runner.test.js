import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { createAgentRunner } = require('../agentRunner')

describe('uitars-bridge agentRunner Volcengine wiring', () => {
  it('passes provider=volcengine + endpoint to GUIAgent factory', async () => {
    const captured = {}
    const runner = createAgentRunner({
      modelProvider: 'volcengine',
      modelEndpoint: 'https://ark.cn-beijing.volces.com/api/v3',
      modelApiKey: 'k',
      modelName: 'doubao-1-5-thinking-vision-pro-250428',
      screenshotImpl: async () => Buffer.from('png'),
      guiAgentFactory: (cfg) => {
        Object.assign(captured, cfg)
        return { runOnce: vi.fn(async () => ({ target: { x: 10, y: 20 } })) }
      },
      nutjs: {
        Point: class Point {
          constructor(x, y) { this.x = x; this.y = y }
        },
        straightTo: (point) => point,
        mouse: { move: vi.fn(async () => {}), leftClick: vi.fn(async () => {}) },
        keyboard: { type: vi.fn(async () => {}) }
      }
    })

    await runner.semanticClick('OK button')
    expect(captured.modelProvider).toBe('volcengine')
    expect(captured.modelEndpoint).toContain('volces.com')
    expect(captured.baseURL).toBe('https://ark.cn-beijing.volces.com/api/v3')
    expect(captured.model).toBe('doubao-1-5-thinking-vision-pro-250428')
  })
})

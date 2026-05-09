import { describe, it, expect, vi } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { planNext, VisionPlannerError } = require('../services/visionPlanner')

describe('visionPlanner.planNext', () => {
  it('returns parsed actions when Doubao API responds with valid JSON', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: JSON.stringify({
          actions: [{ runtime: 'midscene', type: 'web.click', payload: { target: 'chapter' }, risk: 'medium' }]
        }) } }]
      })
    }))

    const result = await planNext({
      goal: 'click chapter',
      history: [],
      screenshotBase64: 'AAAA',
      config: {
        doubaoVisionEndpoint: 'https://x',
        doubaoVisionApiKey: 'k',
        doubaoVisionModel: 'doubao-vision-pro'
      },
      fetchImpl
    })

    expect(result.actions).toHaveLength(1)
    expect(result.actions[0].type).toBe('web.click')
    const callArgs = fetchImpl.mock.calls[0]
    expect(callArgs[0]).toContain('chat/completions')
    const body = JSON.parse(callArgs[1].body)
    expect(body.model).toBe('doubao-vision-pro')
    expect(body.messages[1].content[1].image_url.url).toMatch(/^data:image\/png;base64,AAAA/)
  })

  it('throws VisionPlannerError on malformed JSON', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] })
    }))

    await expect(planNext({
      goal: 'x',
      history: [],
      screenshotBase64: 'AAAA',
      config: { doubaoVisionEndpoint: 'https://x', doubaoVisionApiKey: 'k', doubaoVisionModel: 'm' },
      fetchImpl
    })).rejects.toThrow(/VISION_JSON_INVALID/)
  })

  it('throws when API returns 5xx', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 503, text: async () => 'down' }))

    await expect(planNext({
      goal: 'x',
      history: [],
      screenshotBase64: 'AAAA',
      config: { doubaoVisionEndpoint: 'https://x', doubaoVisionApiKey: 'k', doubaoVisionModel: 'm' },
      fetchImpl
    })).rejects.toThrow()
  })

  it('throws when config is missing required fields', async () => {
    await expect(planNext({
      goal: 'x',
      history: [],
      screenshotBase64: 'AAAA',
      config: { doubaoVisionApiKey: '' }
    })).rejects.toThrow(/VISION_NOT_CONFIGURED/)
  })

  it('uses VisionPlannerError for planner failures', async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] })
    }))

    await expect(planNext({
      goal: 'x',
      history: [],
      screenshotBase64: 'AAAA',
      config: { doubaoVisionEndpoint: 'https://x', doubaoVisionApiKey: 'k', doubaoVisionModel: 'm' },
      fetchImpl
    })).rejects.toBeInstanceOf(VisionPlannerError)
  })
})

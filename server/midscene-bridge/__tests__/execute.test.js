import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const request = require('supertest')
const { createApp } = require('../index')

const fakeBridge = {
  ready: () => true,
  extensionConnected: () => true,
  screenshotPage: async () => Buffer.from('PNG'),
  aiAction: async (instruction) => ({ ok: true, instruction }),
  aiInput: async (text) => ({ ok: true, typed: text }),
  aiQuery: async (question) => ({ ok: true, answer: 'AionUi', question })
}

describe('midscene-bridge POST /execute', () => {
  it('web.observe returns base64 screenshot', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1',
      actionId: 'm1',
      type: 'web.observe',
      payload: {},
      approved: true
    })
    expect(res.body.ok).toBe(true)
    expect(res.body.metadata.screenshotBase64).toBe(Buffer.from('PNG').toString('base64'))
  })

  it('web.click invokes aiAction', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1',
      actionId: 'm2',
      type: 'web.click',
      payload: { target: 'Search button' },
      approved: true
    })
    expect(res.body.ok).toBe(true)
    expect(res.body.metadata.instruction).toContain('Search button')
  })

  it('web.type invokes aiInput without a model loop', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1',
      actionId: 'm3',
      type: 'web.type',
      payload: { text: 'hi' },
      approved: true
    })
    expect(res.body.metadata.typed).toBe('hi')
  })

  it('web.query returns answer', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1',
      actionId: 'm4',
      type: 'web.query',
      payload: { question: 'Page title?' },
      approved: true
    })
    expect(res.body.ok).toBe(true)
    expect(res.body.stdout).toBe('AionUi')
    expect(res.body.metadata.answer).toBe('AionUi')
  })

  it('rejects approved=false', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1',
      actionId: 'm5',
      type: 'web.observe',
      approved: false
    })
    expect(res.status).toBe(403)
  })

  it('returns notImplemented for web.scroll', async () => {
    const app = createApp({ bridge: fakeBridge })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.midscene.v1',
      actionId: 'm6',
      type: 'web.scroll',
      approved: true
    })
    expect(res.body.metadata.notImplemented).toBe(true)
  })
})

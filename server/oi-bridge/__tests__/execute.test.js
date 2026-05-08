import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const fs = require('fs')
const os = require('os')
const path = require('path')
const request = require('supertest')
const { createApp } = require('../index')

describe('oi-bridge POST /execute', () => {
  let tmp
  beforeEach(() => { tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oibridge-')) })
  afterEach(() => fs.rmSync(tmp, { recursive: true, force: true }))

  it('handles file.write via direct fs', async () => {
    const app = createApp({ oiProcess: { isReady: () => true, ensure: async () => {}, endpoint: () => 'http://oi' } })
    const target = path.join(tmp, 'a.txt')
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.open-interpreter.v1', actionId: 'a1',
      type: 'file.write', payload: { path: target, content: 'hello' }, approved: true
    })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(fs.readFileSync(target, 'utf8')).toBe('hello')
    expect(res.body.filesChanged).toContain(target)
  })

  it('handles file.read via direct fs', async () => {
    const target = path.join(tmp, 'b.txt')
    fs.writeFileSync(target, 'world')
    const app = createApp({ oiProcess: { isReady: () => true, ensure: async () => {}, endpoint: () => 'http://oi' } })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.open-interpreter.v1', actionId: 'a2',
      type: 'file.read', payload: { path: target }, approved: true
    })
    expect(res.status).toBe(200)
    expect(res.body.stdout).toBe('world')
  })

  it('returns notImplemented for file.delete', async () => {
    const app = createApp({ oiProcess: { isReady: () => true, ensure: async () => {}, endpoint: () => 'http://oi' } })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.open-interpreter.v1', actionId: 'a3',
      type: 'file.delete', payload: { path: '/x' }, approved: true
    })
    expect(res.body.ok).toBe(false)
    expect(res.body.metadata.notImplemented).toBe(true)
  })

  it('rejects when approved=false', async () => {
    const app = createApp({ oiProcess: { isReady: () => true, ensure: async () => {}, endpoint: () => 'http://oi' } })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.open-interpreter.v1', actionId: 'a4',
      type: 'shell.command', payload: { command: 'echo' }, approved: false
    })
    expect(res.status).toBe(403)
  })

  it('proxies shell.command to OI chat (mocked)', async () => {
    const oiCalls = []
    const app = createApp({
      oiProcess: { isReady: () => true, ensure: async () => {}, endpoint: () => 'http://oi' },
      oiChatImpl: async (endpoint, message) => {
        oiCalls.push({ endpoint, message })
        return { ok: true, stdout: 'hi\n', exitCode: 0 }
      }
    })
    const res = await request(app).post('/execute').send({
      protocol: 'aionui.open-interpreter.v1', actionId: 'a5',
      type: 'shell.command', payload: { command: 'echo hi' }, approved: true
    })
    expect(res.body.ok).toBe(true)
    expect(res.body.stdout).toBe('hi\n')
    expect(oiCalls).toHaveLength(1)
    expect(oiCalls[0].message).toMatch(/echo hi/)
  })
})

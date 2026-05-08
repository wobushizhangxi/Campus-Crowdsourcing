import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { classify, normalizeResult } = require('../translator')

describe('oi-bridge translator.classify', () => {
  it('routes shell.command to oi-chat', () => {
    const r = classify({ type: 'shell.command', payload: { command: 'echo hi' } })
    expect(r.backend).toBe('oi-chat')
    expect(r.message).toMatch(/Run this shell command: echo hi/)
  })

  it('routes file.read to fs', () => {
    const r = classify({ type: 'file.read', payload: { path: '/tmp/x' } })
    expect(r.backend).toBe('fs')
    expect(r.op).toBe('read')
  })

  it('routes file.write to fs', () => {
    const r = classify({ type: 'file.write', payload: { path: '/tmp/x', content: 'hi' } })
    expect(r.backend).toBe('fs')
    expect(r.op).toBe('write')
  })

  it('routes code.execute to oi-chat with language tag', () => {
    const r = classify({ type: 'code.execute', payload: { language: 'python', code: 'print(1)' } })
    expect(r.backend).toBe('oi-chat')
    expect(r.message).toContain('python')
    expect(r.message).toContain('print(1)')
  })

  it('marks file.delete as notImplemented', () => {
    const r = classify({ type: 'file.delete', payload: { path: '/tmp/x' } })
    expect(r.backend).toBe('not-implemented')
  })

  it('marks runtime.setup as notImplemented', () => {
    expect(classify({ type: 'runtime.setup', payload: {} }).backend).toBe('not-implemented')
  })
})

describe('oi-bridge translator.normalizeResult', () => {
  it('produces the adapter-expected shape', () => {
    const out = normalizeResult({ ok: true, stdout: 'hi\n', exitCode: 0, durationMs: 12 })
    expect(out).toMatchObject({
      ok: true, exitCode: 0, stdout: 'hi\n', stderr: '',
      filesChanged: [], durationMs: 12, metadata: {}
    })
    expect(typeof out.completedAt).toBe('string')
  })

  it('defaults exitCode=1 on failure', () => {
    const out = normalizeResult({ ok: false, stderr: 'boom' })
    expect(out.exitCode).toBe(1)
    expect(out.stderr).toBe('boom')
  })
})

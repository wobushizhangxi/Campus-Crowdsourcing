import { describe, it, expect } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const { classify } = require('../translator')

describe('midscene-bridge translator', () => {
  it('routes web.observe to screenshot-page', () => {
    expect(classify({ type: 'web.observe' }).backend).toBe('screenshot-page')
  })

  it('routes web.click to ai-action with natural-language target', () => {
    const r = classify({ type: 'web.click', payload: { target: 'Search button' } })
    expect(r.backend).toBe('ai-action')
    expect(r.instruction).toContain('Search button')
  })

  it('routes web.type to ai-input', () => {
    const r = classify({ type: 'web.type', payload: { text: 'hello' } })
    expect(r.backend).toBe('ai-input')
    expect(r.text).toBe('hello')
  })

  it('routes web.query to ai-query', () => {
    const r = classify({ type: 'web.query', payload: { question: 'Page title?' } })
    expect(r.backend).toBe('ai-query')
    expect(r.question).toBe('Page title?')
  })

  it('marks web.scroll/web.hover/web.assert/web.wait as notImplemented', () => {
    for (const t of ['web.scroll', 'web.hover', 'web.assert', 'web.wait']) {
      expect(classify({ type: t }).backend).toBe('not-implemented')
    }
  })
})

import { describe, expect, test } from 'vitest'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const {
  CONFIRMATION_TIMEOUT_MS,
  classifyConfirmationReply,
  buildConfirmationPrompt,
  buildPendingExplanation,
  buildMissingSkillMessage
} = require('../ipc/chatConfirmation')

describe('chat confirmation helpers', () => {
  test('classifies natural confirmation words', () => {
    for (const text of ['确认', '可以', '同意', '继续', ' 可以 ', '继续。']) {
      expect(classifyConfirmationReply(text)).toBe('confirm')
    }
  })

  test('classifies natural rejection words', () => {
    for (const text of ['取消', '拒绝', '不行', '不要', ' 不要。']) {
      expect(classifyConfirmationReply(text)).toBe('reject')
    }
  })

  test('treats questions and unrelated text as clarification', () => {
    expect(classifyConfirmationReply('这会删除哪个文件？')).toBe('clarification')
    expect(classifyConfirmationReply('先解释一下风险')).toBe('clarification')
    expect(classifyConfirmationReply('hello')).toBe('clarification')
  })

  test('builds a chat prompt for high-risk confirmation', () => {
    const text = buildConfirmationPrompt({
      call: { id: 'call-1', name: 'run_shell_command', args: { command: 'npm install react' } },
      decision: { risk: 'high', reason: 'installs packages' },
      retry: { attempt: 2, previousError: { code: 'BROWSER_TASK_INCOMPLETE', message: 'blank page' } }
    })

    expect(text).toContain('run_shell_command')
    expect(text).toContain('installs packages')
    expect(text).toContain('npm install react')
    expect(text).toContain('确认 / 可以 / 同意 / 继续')
    expect(text).toContain('取消 / 拒绝 / 不行 / 不要')
    expect(text).toContain('previous attempt failed')
  })

  test('builds a clarification reply without resolving the pending operation', () => {
    const text = buildPendingExplanation({
      call: { name: 'delete_path', args: { path: 'C:/Users/g/Desktop/tmp.txt' } },
      decision: { reason: 'deletes a file' }
    })

    expect(text).toContain('delete_path')
    expect(text).toContain('deletes a file')
    expect(text).toContain('C:/Users/g/Desktop/tmp.txt')
    expect(text).toContain('确认 / 可以 / 同意 / 继续')
    expect(text).toContain('取消 / 拒绝 / 不行 / 不要')
  })

  test('builds a missing skill message with installed suggestions', () => {
    const text = buildMissingSkillMessage('missing-skill', [
      { name: 'superpowers', description: 'workflow' },
      { name: 'frontend-design', description: 'ui' }
    ])

    expect(text).toContain('missing-skill')
    expect(text).toContain('/superpowers')
    expect(text).toContain('/frontend-design')
  })

  test('uses a finite confirmation timeout', () => {
    expect(CONFIRMATION_TIMEOUT_MS).toBe(5 * 60 * 1000)
  })
})

import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

describe('unified chat UI wiring', () => {
  test('InputBar has no chat/execute mode toggle', () => {
    const source = readProjectFile('client/src/components/chat/InputBar.jsx')

    expect(source).toContain('export default function InputBar({ onSend, disabled, agentRunning, onCancel })')
    expect(source).toContain('输入消息或任务')
    expect(source).not.toContain('onModeChange')
    expect(source).not.toContain('MessageSquare')
    expect(source).not.toContain('const isExecute')
  })

  test('ChatArea sends every message through sendUserMessage', () => {
    const source = readProjectFile('client/src/components/chat/ChatArea.jsx')

    expect(source).toContain('export default function ChatArea({ conversationId })')
    expect(source).toContain('sendUserMessage(text)')
    expect(source).not.toContain('sendAgentMessage')
    expect(source).not.toContain('mode')
    expect(source).not.toContain('onModeChange')
  })

  test('MainArea and TopBar no longer expose execution mode copy', () => {
    const mainArea = readProjectFile('client/src/components/layout/MainArea.jsx')
    const topBar = readProjectFile('client/src/components/layout/TopBar.jsx')
    const messageList = readProjectFile('client/src/components/chat/MessageList.jsx')

    expect(mainArea).not.toContain('useState')
    expect(mainArea).not.toContain('executionMode')
    expect(topBar).not.toContain('executionMode')
    expect(topBar).not.toContain('聊天模式')
    expect(messageList).not.toContain('执行模式')
  })
})

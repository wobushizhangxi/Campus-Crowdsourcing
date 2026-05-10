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

  test('ToolCard exposes inline approval controls for pending tools', () => {
    const toolCard = readProjectFile('client/src/components/chat/ToolCard.jsx')
    const messageList = readProjectFile('client/src/components/chat/MessageList.jsx')
    const chatArea = readProjectFile('client/src/components/chat/ChatArea.jsx')
    const useChat = readProjectFile('client/src/hooks/useChat.js')

    expect(toolCard).toContain('onApproveTool')
    expect(toolCard).toContain('useEffect')
    expect(toolCard).toContain('awaiting_approval')
    expect(toolCard).toContain('批准')
    expect(toolCard).toContain('拒绝')
    expect(messageList).toContain('onApproveTool')
    expect(chatArea).toContain('handleApproveTool')
    expect(useChat).toContain('approveChatTool')
  })

  test('layout uses chat history sidebar without legacy drawer navigation', () => {
    const sidebar = readProjectFile('client/src/components/layout/Sidebar.jsx')
    const layout = readProjectFile('client/src/components/layout/Layout.jsx')
    const topBar = readProjectFile('client/src/components/layout/TopBar.jsx')

    expect(sidebar).toContain('onSelectConversation')
    expect(sidebar).toContain('搜索聊天')
    expect(sidebar).toContain('重命名')
    expect(sidebar).toContain('永久删除')
    expect(sidebar).not.toContain('控制中心')
    expect(sidebar).not.toContain('模型与运行时')
    expect(sidebar).not.toContain('运行输出')

    expect(layout).toContain('useConversations')
    expect(layout).toContain('SettingsPage')
    expect(layout).not.toContain('RightDrawer')
    expect(layout).not.toContain('onOpenDrawer')

    expect(topBar).not.toContain('Activity')
    expect(topBar).not.toContain('ShieldCheck')
    expect(topBar).not.toContain('FileText')
    expect(topBar).not.toContain('Settings')
    expect(topBar).toContain('统一对话工作台')
  })

  test('action cards are risk-aware and wired through chat callbacks', () => {
    const actionCard = readProjectFile('client/src/components/actions/ActionCard.jsx')
    const messageList = readProjectFile('client/src/components/chat/MessageList.jsx')
    const chatArea = readProjectFile('client/src/components/chat/ChatArea.jsx')
    const useChat = readProjectFile('client/src/hooks/useChat.js')

    expect(actionCard).toContain("risk === 'high'")
    expect(actionCard).toContain('确认执行')
    expect(actionCard).toContain('自动执行中')
    expect(actionCard).toContain('onCancel')
    expect(messageList).toContain('onApproveAction')
    expect(messageList).toContain('onCancelAction')
    expect(chatArea).toContain('handleApproveAction')
    expect(useChat).toContain('cancelAction')
    expect(useChat).toContain('5 * 60 * 1000')
  })

  test('obsolete drawer panels and hooks are removed', () => {
    const obsolete = [
      'client/src/panels/ControlCenterPanel.jsx',
      'client/src/panels/RuntimeStatusPanel.jsx',
      'client/src/panels/RunOutputsPanel.jsx',
      'client/src/panels/LogsPanel.jsx',
      'client/src/components/layout/RightDrawer.jsx',
      'client/src/components/actions/ActionConfirmModal.jsx',
      'client/src/hooks/useActionQueue.js',
      'client/src/hooks/useAuditLog.js'
    ]

    for (const relativePath of obsolete) {
      expect(fs.existsSync(path.join(root, relativePath))).toBe(false)
    }
  })
})

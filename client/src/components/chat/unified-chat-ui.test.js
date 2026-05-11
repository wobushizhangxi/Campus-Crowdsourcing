import { describe, expect, test } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { matchSkillCommands, parseSkillCommandLine } from '../../lib/commands.js'

const root = process.cwd()

function readProjectFile(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
}

describe('unified chat UI wiring', () => {
  test('InputBar has no chat/execute mode toggle', () => {
    const source = readProjectFile('client/src/components/chat/InputBar.jsx')

    expect(source).toContain('export default function InputBar({ onSend, disabled, agentRunning, onCancel, selectedModel, onModelChange, pluginMode, onPluginModeChange })')
    expect(source).toContain('输入消息或任务')
    expect(source).not.toContain('onModeChange')
    expect(source).not.toContain('MessageSquare')
    expect(source).not.toContain('const isExecute')
  })

  test('ChatArea sends every message through sendUserMessage', () => {
    const source = readProjectFile('client/src/components/chat/ChatArea.jsx')

    expect(source).toContain('export default function ChatArea({ conversationId })')
    expect(source).toContain("sendUserMessage(text, pluginMode === 'browser' ? 'browser-use' : selectedModel, { pluginMode })")
    expect(source).not.toContain('sendAgentMessage')
    expect(source).not.toContain('onModeChange')
  })

  test('ModelSelector uses the configured Doubao endpoint alias instead of a hard-coded old model', () => {
    const source = readProjectFile('client/src/components/chat/ModelSelector.jsx')

    expect(source).toContain("{ id: 'doubao-vision'")
    expect(source).toContain("'doubao-seed-1-6-vision': 'doubao-vision'")
    expect(source).not.toContain("{ id: 'doubao-seed-1-6-vision'")
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
    expect(toolCard).toContain('retry')
    expect(toolCard).toContain('上次失败')
    expect(toolCard).toContain('批准')
    expect(toolCard).toContain('拒绝')
    expect(messageList).toContain('onApproveTool')
    expect(chatArea).toContain('handleApproveTool')
    expect(useChat).toContain('approveChatTool')
    expect(useChat).toContain('event.retry')
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

  test('SettingsPage shows external-link buttons for all model API keys', () => {
    const settings = readProjectFile('client/src/pages/SettingsPage.jsx')

    expect(settings).toContain('ExternalLink')
    expect(settings.match(/<ApiKeyInput /g)).toHaveLength(4)
    expect(settings).toContain('id="settings-qwen-api-key"')
    expect(settings).toContain('id="settings-deepseek-api-key"')
    expect(settings).toContain('id="settings-doubao-api-key"')
    expect(settings).toContain('id="settings-browser-use-api-key"')
    expect(settings).toContain("qwenApiKey: ''")
    expect(settings).toContain("browserUseApiKey: ''")
    expect(settings).toContain('https://bailian.console.aliyun.com/')
    expect(settings).toContain('https://platform.deepseek.com/api_keys')
    expect(settings).toContain('https://console.volcengine.com/ark/region:ark+cn-beijing/apiKey')
    expect(settings).toContain('https://zenmux.ai/')
  })

  test('SettingsPage keeps masked API key state visible after save or reload', () => {
    const settings = readProjectFile('client/src/pages/SettingsPage.jsx')

    expect(settings).toContain('maskedKeys')
    expect(settings).toContain('setMaskedKeys')
    expect(settings).toContain('applyConfig(result.config || {})')
    expect(settings).toContain("placeholder={maskedKeys.qwenApiKey || 'DashScope API Key'}")
    expect(settings).toContain("placeholder={maskedKeys.deepseekApiKey || 'sk-...'}")
    expect(settings).toContain("placeholder={maskedKeys.doubaoVisionApiKey || 'Volcengine Ark API Key'}")
    expect(settings).toContain("placeholder={maskedKeys.browserUseApiKey || 'ZenMux API Key'}")
    expect(settings).toContain('savedValue={maskedKeys.qwenApiKey}')
    expect(settings).toContain('savedValue={maskedKeys.deepseekApiKey}')
    expect(settings).toContain('savedValue={maskedKeys.doubaoVisionApiKey}')
    expect(settings).toContain('savedValue={maskedKeys.browserUseApiKey}')
  })

  test('SettingsPage exposes Browser Use endpoint model and vision toggle', () => {
    const settings = readProjectFile('client/src/pages/SettingsPage.jsx')

    expect(settings).toContain('Browser Use')
    expect(settings).toContain('browserUseEndpoint')
    expect(settings).toContain('browserUseModel')
    expect(settings).toContain('browserUseVisionEnabled')
    expect(settings).toContain('https://zenmux.ai/api/v1')
    expect(settings).toContain('openai/gpt-5.5')
    expect(settings).toContain('checked={form.browserUseVisionEnabled !== false}')
    expect(settings).toContain('Vision enabled')
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

  test('development startup does not force DevTools open by default', () => {
    const main = readProjectFile('electron/main.js')

    expect(main).toContain("process.env.AIONUI_OPEN_DEVTOOLS === '1'")
    expect(main).toContain('if (shouldOpenDevTools) mainWindow.webContents.openDevTools()')
    expect(main).not.toContain('if (isDev) mainWindow.webContents.openDevTools()')
  })

  test('bridge failures navigate to runtime diagnostics', () => {
    const layout = readProjectFile('client/src/components/layout/Layout.jsx')
    const statusBar = readProjectFile('client/src/components/BridgeStatusBar.jsx')
    const settings = readProjectFile('client/src/pages/SettingsPage.jsx')

    expect(layout).toContain('initialTab')
    expect(statusBar).toContain('lastError')
    expect(statusBar).toContain('title=')
    expect(settings).toContain("bridge:status")
    expect(settings).toContain('restartBridge')
    expect(settings).toContain("window.electronAPI?.invoke?.('bridge:restart'")
    expect(settings).toContain('onRestart')
    expect(settings).toContain('bridgeKey="browserUse"')
    expect(settings).toContain('bridgeKey="uitars"')
    expect(settings).toContain('BridgeDetailCard')
    expect(settings).toContain('nextSteps')
    expect(settings).toContain('stdoutLog')
    expect(settings).toContain('stderrLog')
  })

  test('InputBar exposes Codex-style plugin menu and Browser plugin label', () => {
    const source = readProjectFile('client/src/components/chat/InputBar.jsx')

    expect(source).toContain('插件')
    expect(source).toContain('浏览器')
    expect(source).toContain('Browser Use')
    expect(source).toContain('onPluginModeChange')
  })

  test('ModelSelector can display Browser Use model chip for plugin mode', () => {
    const source = readProjectFile('client/src/components/chat/ModelSelector.jsx')

    expect(source).toContain('browser-use')
    expect(source).toContain('openai/gpt-5.5')
    expect(source).toContain('pluginMode')
  })

  test('ApprovalCard is limited to confirmation controls', () => {
    const source = readProjectFile('client/src/components/chat/ApprovalCard.jsx')

    expect(source).toContain('onApprove')
    expect(source).toContain('onReject')
    expect(source).not.toContain('final_answer')
    expect(source).not.toContain('reasoning_summary')
  })

  test('MessageBubble renders streamed reasoning and tool progress entries', () => {
    const source = readProjectFile('client/src/components/chat/MessageBubble.jsx')

    expect(source).toContain('reasoning_summary')
    expect(source).toContain('tool_progress')
    expect(source).toContain('stream')
  })

  test('slash commands are backed by installed skills instead of legacy cards', () => {
    const commands = readProjectFile('client/src/lib/commands.js')
    const useCommand = readProjectFile('client/src/hooks/useCommand.js')
    const palette = readProjectFile('client/src/components/chat/CommandPalette.jsx')

    expect(commands).toContain('parseSkillCommandLine')
    expect(commands).toContain('matchSkillCommands')
    expect(commands).not.toContain("id: 'paper'")
    expect(commands).not.toContain("id: 'plan'")
    expect(commands).not.toContain("id: 'schedule'")
    expect(commands).not.toContain("cardType: 'paper'")
    expect(useCommand).toContain('skills = []')
    expect(useCommand).toContain('matchSkillCommands(text, skills)')
    expect(palette).toContain('Sparkles')
    expect(palette).not.toContain('const Icon = command.icon')
  })

  test('skill slash helpers match and parse installed skills case-insensitively', () => {
    const skills = [
      { name: 'superpowers', description: 'Structured development workflows' },
      { name: 'documents', description: 'Document editing' }
    ]

    expect(matchSkillCommands('/sup', skills).map((command) => command.id)).toEqual(['superpowers'])
    expect(matchSkillCommands('/SUP', skills).map((command) => command.id)).toEqual(['superpowers'])
    expect(parseSkillCommandLine('/superpowers do work', skills)).toEqual({
      forcedSkill: 'superpowers',
      message: 'do work'
    })
    expect(parseSkillCommandLine('/SUPERPOWERS do work', skills)).toEqual({
      forcedSkill: 'superpowers',
      message: 'do work'
    })
    expect(parseSkillCommandLine('/missing do work', skills)).toBeNull()
    expect(parseSkillCommandLine('/superpowers', skills)).toBeNull()
    expect(parseSkillCommandLine('normal text', skills)).toBeNull()
  })
})

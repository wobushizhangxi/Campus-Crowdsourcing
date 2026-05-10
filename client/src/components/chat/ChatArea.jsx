import { useState } from 'react'
import { useChat } from '../../hooks/useChat.js'
import MessageList from './MessageList.jsx'
import InputBar from './InputBar.jsx'
import { loadModel } from './ModelSelector.jsx'

export default function ChatArea({ conversationId }) {
  const { messages, streaming, agentRunning, sendUserMessage, handleAbort, handleApproveTool, handleDenyTool, handleApproveAction, handleDenyAction, handleCancelAction, updateCard, addFileCard } = useChat(conversationId)
  const [selectedModel, setSelectedModel] = useState(loadModel)

  function handleSend(text) {
    sendUserMessage(text, selectedModel)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList
        messages={messages}
        onUpdateCard={updateCard}
        onFileGenerated={addFileCard}
        onApproveTool={handleApproveTool}
        onDenyTool={handleDenyTool}
        onApproveAction={handleApproveAction}
        onDenyAction={handleDenyAction}
        onCancelAction={handleCancelAction}
      />
      <InputBar
        onSend={handleSend}
        disabled={streaming || agentRunning}
        agentRunning={agentRunning}
        onCancel={handleAbort}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
      />
    </div>
  )
}

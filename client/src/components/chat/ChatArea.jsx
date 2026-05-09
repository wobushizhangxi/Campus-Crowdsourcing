import { useChat } from '../../hooks/useChat.js'
import MessageList from './MessageList.jsx'
import InputBar from './InputBar.jsx'
import ApprovalCard from './ApprovalCard.jsx'

export default function ChatArea({ conversationId, mode, onModeChange }) {
  const { messages, streaming, agentRunning, pendingApproval, sendUserMessage, sendAgentMessage, handleApprove, handleDeny, handleAbort, updateCard, addFileCard } = useChat(conversationId)

  function handleSend(text) {
    if (mode === 'execute') {
      sendAgentMessage(text)
    } else {
      sendUserMessage(text, { mode })
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList messages={messages} onUpdateCard={updateCard} onFileGenerated={addFileCard} />
      {pendingApproval && (
        <ApprovalCard
          call={pendingApproval.call}
          decision={pendingApproval.decision}
          onApprove={() => handleApprove(pendingApproval.callId)}
          onDeny={() => handleDeny(pendingApproval.callId)}
        />
      )}
      <InputBar
        mode={mode}
        onModeChange={onModeChange}
        onSend={handleSend}
        disabled={streaming || agentRunning}
        agentRunning={agentRunning}
        onCancel={handleAbort}
      />
    </div>
  )
}

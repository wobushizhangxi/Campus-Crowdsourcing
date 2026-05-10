import { useChat } from '../../hooks/useChat.js'
import MessageList from './MessageList.jsx'
import InputBar from './InputBar.jsx'

export default function ChatArea({ conversationId }) {
  const { messages, streaming, agentRunning, sendUserMessage, handleAbort, updateCard, addFileCard } = useChat(conversationId)

  function handleSend(text) {
    sendUserMessage(text)
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <MessageList messages={messages} onUpdateCard={updateCard} onFileGenerated={addFileCard} />
      <InputBar
        onSend={handleSend}
        disabled={streaming || agentRunning}
        agentRunning={agentRunning}
        onCancel={handleAbort}
      />
    </div>
  )
}

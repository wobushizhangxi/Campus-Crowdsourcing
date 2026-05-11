export default function MessageBubble({ message, role, content, streaming }) {
  const isToolProgressStream = message?.type === 'tool_progress' || message?.type?.startsWith('tool_')

  if (message?.stream && message.type === 'reasoning_summary') {
    return (
      <div className="mb-2 px-3 py-2 text-xs text-[color:var(--text-muted)]">
        {message.content}
      </div>
    )
  }

  if (message?.stream && isToolProgressStream) {
    return (
      <div className="mb-2 px-3 py-2 text-xs text-[color:var(--text-muted)]">
        <span className="font-medium text-[color:var(--text-primary)]">{message.tool}</span>
        <span className="ml-2">{message.content}</span>
      </div>
    )
  }

  const isUser = role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[75%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${
          isUser
            ? 'bg-[color:var(--accent)] text-white rounded-br-sm'
            : 'bg-[color:var(--bg-secondary)] text-[color:var(--text-primary)] rounded-bl-sm border border-[color:var(--border)]'
        }`}
      >
        {content}
        {streaming && <span className="inline-block w-1 h-4 bg-current ml-1 animate-pulse align-middle" />}
      </div>
    </div>
  )
}

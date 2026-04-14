import { ArrowLeft, LoaderCircle, Send } from 'lucide-react';

export default function ChatOverlay({
  activeChatTask,
  chatInput,
  chatMessages,
  chatPendingNewMessageCount,
  chatScrollContainerRef,
  currentUser,
  getConversationTitle,
  handleSendMessage,
  isSendingMessage,
  onChatInputChange,
  onClose,
  onScroll,
  scrollChatToBottom,
}) {
  if (!activeChatTask) {
    return null;
  }

  const messages = chatMessages[activeChatTask.id] || [];

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
      <div className="relative flex h-full w-full max-w-md flex-col bg-slate-50 text-slate-900 shadow-2xl sm:h-[85vh] sm:overflow-hidden sm:rounded-[32px]">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h2 className="text-lg font-bold">{getConversationTitle(activeChatTask)}</h2>
              <p className="text-xs text-slate-500">任务：{activeChatTask.title}</p>
            </div>
          </div>
        </header>

        <div ref={chatScrollContainerRef} onScroll={onScroll} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="mt-10 text-center text-sm text-slate-400">
              当前会话还没有消息，先发一条消息开始沟通吧。
            </div>
          ) : (
            messages.map((message) => {
              const isMe = message.senderUsername === currentUser.studentId || message.sender === 'me';

              return (
                <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                      isMe
                        ? 'rounded-br-none bg-cyan-600 text-white'
                        : 'rounded-bl-none border border-slate-200 bg-white text-slate-800'
                    }`}
                  >
                    <p className="leading-relaxed">{message.text}</p>
                    <span className={`mt-1 block text-[10px] ${isMe ? 'text-cyan-200' : 'text-slate-400'}`}>
                      {message.createdAt || message.time}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <footer className="border-t border-slate-200 bg-white p-4 pb-6">
          <form onSubmit={handleSendMessage} className="flex items-center gap-3">
            <input
              type="text"
              value={chatInput}
              onChange={(event) => onChatInputChange(event.target.value)}
              placeholder="输入消息内容"
              disabled={isSendingMessage}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isSendingMessage}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSendingMessage ? <LoaderCircle size={18} className="animate-spin" /> : <Send size={18} className="-ml-0.5" />}
            </button>
          </form>
        </footer>

        {chatPendingNewMessageCount > 0 ? (
          <button
            type="button"
            onClick={() => scrollChatToBottom('smooth')}
            className="absolute bottom-24 right-4 rounded-full bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-cyan-700"
          >
            {chatPendingNewMessageCount > 99 ? '99+ 条新消息' : `${chatPendingNewMessageCount} 条新消息`}
          </button>
        ) : null}
      </div>
    </div>
  );
}

import { ArrowLeft, LoaderCircle, Send } from 'lucide-react';

const DEFAULT_TITLE = '\u6d88\u606f\u4e2d\u5fc3';
const DEFAULT_SUBTITLE = '\u8bf7\u5148\u5728\u5de6\u4fa7\u9009\u62e9\u4e00\u4e2a\u4f1a\u8bdd\u5f00\u59cb\u804a\u5929\u3002';
const EMPTY_TITLE = '\u9009\u62e9\u4e00\u4e2a\u4f1a\u8bdd\u5f00\u59cb\u804a\u5929';
const EMPTY_SUBTITLE = '\u6253\u5f00\u4f1a\u8bdd\u540e\uff0c\u6d88\u606f\u5217\u8868\u3001\u5df2\u8bfb\u72b6\u6001\u548c\u8f93\u5165\u6846\u90fd\u4f1a\u51fa\u73b0\u5728\u8fd9\u91cc\u3002';
const NO_MESSAGES = '\u5f53\u524d\u4f1a\u8bdd\u8fd8\u6ca1\u6709\u6d88\u606f\uff0c\u5148\u53d1\u4e00\u6761\u6d88\u606f\u5f00\u59cb\u6c9f\u901a\u5427\u3002';
const INPUT_PLACEHOLDER = '\u8f93\u5165\u6d88\u606f\u5185\u5bb9';
const INPUT_DISABLED_PLACEHOLDER = '\u8bf7\u9009\u62e9\u4f1a\u8bdd\u540e\u53d1\u9001\u6d88\u606f';
const CLOSE_CHAT_LABEL = '\u5173\u95ed\u804a\u5929';
const SEND_MESSAGE_LABEL = '\u53d1\u9001\u6d88\u606f';
const MESSAGE_COUNT_SUFFIX = '\u6761\u6d88\u606f';
const NEW_MESSAGE_SUFFIX = '\u6761\u65b0\u6d88\u606f';

export default function ChatPanel({
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
  variant = 'inline',
}) {
  const isOverlay = variant === 'overlay';
  const messages = activeChatTask ? chatMessages[activeChatTask.id] || [] : [];
  const conversationTitle = activeChatTask ? getConversationTitle(activeChatTask) : DEFAULT_TITLE;
  const conversationSubtitle = activeChatTask
    ? '\u4efb\u52a1\uff1a' + (activeChatTask.title || '\u672a\u547d\u540d\u4efb\u52a1')
    : DEFAULT_SUBTITLE;

  // Overlay variant widens the same shared panel instead of duplicating layout code.
  const panelClasses = isOverlay
    ? 'relative flex h-full w-full flex-col bg-slate-50 text-slate-900 shadow-2xl sm:h-[85vh] sm:max-h-[85vh] sm:overflow-hidden sm:rounded-[32px] sm:max-w-3xl xl:max-w-5xl'
    : 'relative flex min-h-[640px] flex-col overflow-hidden rounded-[32px] border border-slate-200 bg-white text-slate-900 shadow-sm';
  const bodyClasses = isOverlay
    ? 'flex-1 space-y-4 overflow-y-auto p-5 sm:p-6'
    : 'flex-1 space-y-4 overflow-y-auto bg-slate-50 p-5';
  const footerClasses = isOverlay ? 'border-t border-slate-200 bg-white p-4 pb-6' : 'border-t border-slate-200 bg-white p-4';
  const placeholderClasses = isOverlay
    ? 'rounded-3xl border border-dashed border-slate-200 bg-white/70 px-6 py-10 text-center text-sm text-slate-500'
    : 'rounded-3xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center text-sm text-slate-500 shadow-sm';

  return (
    <section className={panelClasses}>
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 shadow-sm sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {onClose && activeChatTask ? (
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-slate-100 p-2 text-slate-600 transition hover:bg-slate-200"
              aria-label={CLOSE_CHAT_LABEL}
            >
              <ArrowLeft size={20} />
            </button>
          ) : null}
          <div className="min-w-0">
            <h2 className="truncate text-lg font-bold text-slate-900">{conversationTitle}</h2>
            <p className="truncate text-xs text-slate-500">{conversationSubtitle}</p>
          </div>
        </div>
        {activeChatTask ? (
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-bold text-cyan-700">
            {messages.length} {MESSAGE_COUNT_SUFFIX}
          </span>
        ) : null}
      </header>

      <div ref={chatScrollContainerRef} onScroll={onScroll} className={bodyClasses}>
        {!activeChatTask ? (
          <div className={placeholderClasses}>
            <p className="text-base font-semibold text-slate-800">{EMPTY_TITLE}</p>
            <p className="mt-2 text-sm text-slate-500">{EMPTY_SUBTITLE}</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="mt-10 text-center text-sm text-slate-400">{NO_MESSAGES}</div>
        ) : (
          messages.map((message) => {
            const isMe = message.senderUsername === currentUser.studentId || message.sender === 'me';

            return (
              <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm ${
                    isMe
                      ? 'rounded-br-none bg-cyan-600 text-white'
                      : 'rounded-bl-none border border-slate-200 bg-white text-slate-800 shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{message.text}</p>
                  <span className={`mt-1 block text-[10px] ${isMe ? 'text-cyan-200' : 'text-slate-400'}`}>
                    {message.createdAt || message.time}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      <footer className={footerClasses}>
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input
            type="text"
            value={chatInput}
            onChange={(event) => onChatInputChange(event.target.value)}
            placeholder={activeChatTask ? INPUT_PLACEHOLDER : INPUT_DISABLED_PLACEHOLDER}
            disabled={!activeChatTask || isSendingMessage}
            className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 disabled:bg-slate-100"
          />
          <button
            type="submit"
            disabled={!activeChatTask || !chatInput.trim() || isSendingMessage}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cyan-600 text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            aria-label={SEND_MESSAGE_LABEL}
          >
            {isSendingMessage ? (
              <LoaderCircle size={18} className="animate-spin" />
            ) : (
              <Send size={18} className="-ml-0.5" />
            )}
          </button>
        </form>
      </footer>

      {activeChatTask && chatPendingNewMessageCount > 0 ? (
        <button
          type="button"
          onClick={() => scrollChatToBottom('smooth')}
          className="absolute bottom-24 right-4 rounded-full bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:bg-cyan-700"
        >
          {chatPendingNewMessageCount > 99
            ? '99+ ' + NEW_MESSAGE_SUFFIX
            : chatPendingNewMessageCount + ' ' + NEW_MESSAGE_SUFFIX}
        </button>
      ) : null}
    </section>
  );
}

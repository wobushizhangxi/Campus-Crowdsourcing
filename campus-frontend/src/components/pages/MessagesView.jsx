import { ClipboardList, MessageSquare } from 'lucide-react';
import ChatPanel from '../chat/ChatPanel';

const LIST_TITLE = '\u4f1a\u8bdd\u5217\u8868';
const LIST_SUBTITLE = '\u6d88\u606f\u6309\u4efb\u52a1\u5206\u7ec4\uff0c\u65b9\u4fbf\u4f60\u6301\u7eed\u8ddf\u8fdb\u4e0a\u4e0b\u6587\u3002';
const EMPTY_LIST = '\u8fd8\u6ca1\u6709\u4f1a\u8bdd\u3002\u5148\u63a5\u53d6\u4efb\u52a1\uff0c\u6216\u7b49\u5f85\u63a5\u5355\u4eba\u8054\u7cfb\u4f60\u3002';
const EMPTY_PREVIEW = '\u6682\u65e0\u6d88\u606f';
const NEW_MESSAGE_LABEL = '\u65b0\u6d88\u606f';
const TASK_LABEL = '\u4efb\u52a1';
const ACTIVE_CONVERSATION_LABEL = '\u5f53\u524d\u4f1a\u8bdd';

export default function MessagesView({
  activeChatTask,
  chatInput,
  chatMessages,
  chatPendingNewMessageCount,
  chatScrollContainerRef,
  currentUser,
  formatRmb,
  getConversationTitle,
  getLatestServerMessage,
  getTaskStatusMeta,
  handleSendMessage,
  isConversationUnread,
  isSendingMessage,
  onChatInputChange,
  onClose,
  onScroll,
  openChat,
  scrollChatToBottom,
  sortedChatableTasks,
}) {
  return (
    <div className="p-5">
      <div className="space-y-4 xl:grid xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start xl:gap-5 xl:space-y-0">
        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">{LIST_TITLE}</h3>
                <p className="mt-1 text-sm text-slate-500">{LIST_SUBTITLE}</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                {sortedChatableTasks.length}
              </span>
            </div>
          </div>

          <div className="space-y-4">
            {sortedChatableTasks.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
                {EMPTY_LIST}
              </div>
            ) : (
              sortedChatableTasks.map((task) => {
                const latestMessage = getLatestServerMessage(task.id);
                const isUnread = isConversationUnread(task.id);
                const isSelectedConversation = activeChatTask?.id === task.id;
                const latestPreview = latestMessage?.text || EMPTY_PREVIEW;
                const taskStatusMeta = getTaskStatusMeta(task.status);

                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => openChat(task)}
                    aria-pressed={isSelectedConversation}
                    className={`flex w-full items-start justify-between gap-3 rounded-3xl border p-5 text-left shadow-sm transition focus:outline-none focus:ring-2 focus:ring-cyan-200 ${
                      isSelectedConversation
                        ? 'border-cyan-500 bg-cyan-50 shadow-md ring-1 ring-cyan-200'
                        : 'border-slate-200 bg-white hover:border-cyan-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                        <MessageSquare size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900">{getConversationTitle(task)}</h3>
                          {isUnread ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                              {NEW_MESSAGE_LABEL}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 rounded-2xl border border-cyan-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-cyan-700">
                            <ClipboardList size={14} />
                            {TASK_LABEL}
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-900">
                            {task.title || '\u672a\u547d\u540d\u4efb\u52a1'}
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${taskStatusMeta.className}`}>
                              {taskStatusMeta.label}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                              {formatRmb(task.reward)}
                            </span>
                            <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                              {TASK_LABEL} #{task.id}
                            </span>
                          </div>
                        </div>

                        <p className="mt-3 line-clamp-1 text-xs text-slate-500">
                          \u6700\u65b0\u6d88\u606f\uff1a{latestPreview}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {isSelectedConversation ? (
                        <span className="rounded-full bg-cyan-600 px-3 py-1 text-xs font-bold text-white">
                          {ACTIVE_CONVERSATION_LABEL}
                        </span>
                      ) : null}
                      {latestMessage?.createdAt ? (
                        <span className="text-xs text-slate-400">{latestMessage.createdAt}</span>
                      ) : null}
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold ${
                          isUnread ? 'bg-rose-100 text-rose-600' : 'bg-cyan-100 text-cyan-600'
                        }`}
                      >
                        {isUnread ? '\u7acb\u5373\u67e5\u770b' : '\u6253\u5f00'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="hidden xl:block xl:min-h-0 xl:self-stretch">
          <ChatPanel
            activeChatTask={activeChatTask}
            chatInput={chatInput}
            chatMessages={chatMessages}
            chatPendingNewMessageCount={chatPendingNewMessageCount}
            chatScrollContainerRef={chatScrollContainerRef}
            currentUser={currentUser}
            getConversationTitle={getConversationTitle}
            handleSendMessage={handleSendMessage}
            isSendingMessage={isSendingMessage}
            onChatInputChange={onChatInputChange}
            onClose={onClose}
            onScroll={onScroll}
            scrollChatToBottom={scrollChatToBottom}
            variant="inline"
          />
        </div>
      </div>
    </div>
  );
}

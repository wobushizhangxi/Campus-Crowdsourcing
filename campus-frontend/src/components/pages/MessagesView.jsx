import { ClipboardList, MessageSquare } from 'lucide-react';

export default function MessagesView({
  formatRmb,
  getConversationTitle,
  getLatestServerMessage,
  getTaskStatusMeta,
  isConversationUnread,
  openChat,
  sortedChatableTasks,
}) {
  return (
    <div className="space-y-4 p-5">
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-900">会话列表</h3>
              <p className="mt-1 text-sm text-slate-500">消息按任务分组，方便你持续跟进上下文。</p>
            </div>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
              {sortedChatableTasks.length}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {sortedChatableTasks.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white px-5 py-8 text-center text-sm text-slate-500 shadow-sm">
              还没有会话。先接取任务，或等待接单人联系你。
            </div>
          ) : (
            sortedChatableTasks.map((task) => {
              const latestMessage = getLatestServerMessage(task.id);
              const isUnread = isConversationUnread(task.id);
              const latestPreview = latestMessage?.text || 'No messages yet.';
              const taskStatusMeta = getTaskStatusMeta(task.status);

              return (
                <div
                  key={task.id}
                  onClick={() => openChat(task)}
                  className="flex cursor-pointer items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-200 hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-cyan-100 text-cyan-700">
                      <MessageSquare size={20} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-900">{getConversationTitle(task)}</h3>
                        {isUnread ? (
                          <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">新消息</span>
                        ) : null}
                      </div>

                      <div className="mt-3 rounded-2xl border border-cyan-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-[0.2em] text-cyan-700">
                          <ClipboardList size={14} />
                          任务
                        </div>
                        <p className="mt-2 line-clamp-2 text-sm font-bold leading-6 text-slate-900">
                          {task.title || '未命名任务'}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${taskStatusMeta.className}`}>
                            {taskStatusMeta.label}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-700">
                            {formatRmb(task.reward)}
                          </span>
                          <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500">
                            任务 #{task.id}
                          </span>
                        </div>
                      </div>

                      <p className="mt-3 line-clamp-1 text-xs text-slate-500">最新消息：{latestPreview}</p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2">
                    {latestMessage?.createdAt ? (
                      <span className="text-xs text-slate-400">{latestMessage.createdAt}</span>
                    ) : null}
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        isUnread ? 'bg-rose-100 text-rose-600' : 'bg-cyan-100 text-cyan-600'
                      }`}
                    >
                      {isUnread ? '立即查看' : '打开'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
